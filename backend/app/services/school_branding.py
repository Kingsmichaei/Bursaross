from __future__ import annotations

import hashlib
import logging
import mimetypes
from html.parser import HTMLParser
from io import BytesIO
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx
from PIL import Image

from app.core.config import settings

logger = logging.getLogger(__name__)

FALLBACK_COLORS = {
    "primary_color": "#2563EB",
    "secondary_color": "#1E40AF",
    "accent_color": "#FFFFFF",
}


class BrandingHTMLParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._section_depth = 0
        self.img_candidates: list[dict[str, Any]] = []
        self.favicon_candidates: list[str] = []

    def handle_starttag(self, tag: str, attrs):
        attrs_map = {name.lower(): (value or "") for name, value in attrs}
        tag = tag.lower()

        if tag in {"header", "nav"}:
            self._section_depth += 1

        if tag == "img":
            self.img_candidates.append(
                {
                    "attrs": attrs_map,
                    "in_brand_area": self._section_depth > 0,
                }
            )

        if tag == "link":
            rel = attrs_map.get("rel", "").lower()
            href = attrs_map.get("href", "")
            if href and any(token in rel for token in ["icon", "shortcut icon", "apple-touch-icon"]):
                self.favicon_candidates.append(href)

    def handle_endtag(self, tag: str):
        tag = tag.lower()
        if tag in {"header", "nav"} and self._section_depth > 0:
            self._section_depth -= 1


class SchoolBrandingService:
    def __init__(self) -> None:
        self.cache_dir = Path(__file__).resolve().parents[1] / "static" / "branding-cache"
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def normalize_website_url(self, website_url: str) -> str:
        candidate = website_url.strip()
        if not candidate:
            raise ValueError("School website URL is required")
        if not candidate.startswith(("http://", "https://")):
            candidate = f"https://{candidate}"

        parsed = urlparse(candidate)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("Please enter a valid public website URL")

        return candidate.rstrip("/")

    async def build_branding(self, website_url: str, school_name: str) -> dict[str, Any]:
        normalized_url = self.normalize_website_url(website_url)
        fallback_logo = self._fallback_logo_url(school_name)

        try:
            html = await self._fetch_html(normalized_url)
            parser = BrandingHTMLParser()
            parser.feed(html)

            logo_url = self._pick_logo_url(parser, normalized_url)
            if not logo_url and parser.favicon_candidates:
                logo_url = self._resolve_url(normalized_url, parser.favicon_candidates[0])

            colors = FALLBACK_COLORS.copy()
            if logo_url:
                try:
                    image_bytes = await self._download_image(logo_url)
                    colors = self._extract_palette(image_bytes)
                except Exception:
                    logger.exception("Failed to extract colors from logo %s", logo_url)
                    colors = FALLBACK_COLORS.copy()

            return {
                "website_url": normalized_url,
                "logo_url": logo_url or fallback_logo,
                **colors,
                "source": "live" if logo_url else "fallback",
            }
        except ValueError:
            raise
        except Exception:
            logger.exception("Branding lookup failed for %s", normalized_url)
            return {
                "website_url": normalized_url,
                "logo_url": fallback_logo,
                **FALLBACK_COLORS,
                "source": "fallback",
                "warning": "Branding lookup failed; fallback colors were used.",
            }

    async def _fetch_html(self, website_url: str) -> str:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers={"User-Agent": "BursarOS Branding Bot/1.0"}) as client:
            response = await client.get(website_url)
            response.raise_for_status()
            return response.text

    def _pick_logo_url(self, parser: BrandingHTMLParser, base_url: str) -> str | None:
        candidates: list[tuple[int, str]] = []
        keywords = ["logo", "brand", "site-logo", "navbar-brand"]

        for item in parser.img_candidates:
            attrs = item["attrs"]
            blob = " ".join(
                [
                    attrs.get("alt", ""),
                    attrs.get("id", ""),
                    attrs.get("class", ""),
                    attrs.get("title", ""),
                    attrs.get("src", ""),
                    attrs.get("data-src", ""),
                    attrs.get("data-lazy-src", ""),
                ]
            ).lower()

            score = 0
            if item["in_brand_area"]:
                score += 5
            if any(keyword in blob for keyword in keywords):
                score += 5
            if attrs.get("width") and attrs.get("height"):
                score += 1

            src = attrs.get("src") or attrs.get("data-src") or attrs.get("data-lazy-src")
            if src:
                candidates.append((score, self._resolve_url(base_url, src)))

        if not candidates:
            return None

        candidates.sort(key=lambda item: item[0], reverse=True)
        return candidates[0][1]

    def _resolve_url(self, base_url: str, candidate_url: str) -> str:
        return urljoin(f"{base_url}/", candidate_url)

    async def _download_image(self, image_url: str) -> bytes:
        cache_key = hashlib.sha256(image_url.encode("utf-8")).hexdigest()
        cached_path = self.cache_dir / f"{cache_key}.img"
        if cached_path.exists():
            return cached_path.read_bytes()

        async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers={"User-Agent": "BursarOS Branding Bot/1.0"}) as client:
            response = await client.get(image_url)
            response.raise_for_status()

            content_type = response.headers.get("content-type", "")
            if content_type and not content_type.startswith("image/"):
                raise ValueError(f"URL did not return an image: {image_url}")

            cached_path.write_bytes(response.content)
            return response.content

    def _extract_palette(self, image_bytes: bytes) -> dict[str, str]:
        with Image.open(BytesIO(image_bytes)) as image:
            image = image.convert("RGBA")
            if "A" in image.getbands():
                background = Image.new("RGBA", image.size, (255, 255, 255, 255))
                image = Image.alpha_composite(background, image)

            image = image.convert("RGB")
            image.thumbnail((256, 256))
            palette_image = image.quantize(colors=8, method=Image.Quantize.MEDIANCUT)

            color_counts = palette_image.getcolors(256 * 256) or []
            palette = palette_image.getpalette() or []

        colors: list[str] = []
        ranked_colors = sorted(color_counts, key=lambda item: item[0], reverse=True)

        for _, index in ranked_colors:
            rgb = palette[index * 3 : index * 3 + 3]
            if len(rgb) != 3:
                continue
            hex_color = self._rgb_to_hex(tuple(rgb))
            if hex_color not in colors and not self._is_near_white(hex_color):
                colors.append(hex_color)

        if not colors:
            return FALLBACK_COLORS.copy()

        primary = colors[0]
        secondary = colors[1] if len(colors) > 1 else FALLBACK_COLORS["secondary_color"]
        accent = colors[2] if len(colors) > 2 else FALLBACK_COLORS["accent_color"]

        return {
            "primary_color": primary,
            "secondary_color": secondary,
            "accent_color": accent,
        }

    def _rgb_to_hex(self, rgb: tuple[int, int, int]) -> str:
        return "#%02X%02X%02X" % rgb

    def _is_near_white(self, hex_color: str) -> bool:
        hex_color = hex_color.lstrip("#")
        if len(hex_color) != 6:
            return False
        red = int(hex_color[0:2], 16)
        green = int(hex_color[2:4], 16)
        blue = int(hex_color[4:6], 16)
        return red >= 245 and green >= 245 and blue >= 245

    def _fallback_logo_url(self, school_name: str) -> str:
        safe_name = school_name.replace(" ", "+")
        return f"https://ui-avatars.com/api/?name={safe_name}&background=2563EB&color=FFFFFF"
