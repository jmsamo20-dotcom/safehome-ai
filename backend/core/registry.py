"""
세이프홈 AI - 플러그인 레지스트리
plugins/ 디렉토리를 자동 스캔하여 ICountryPlugin 구현체를 등록
"""

import importlib
import logging
import pkgutil
from typing import Optional

from core.interfaces import ICountryPlugin

logger = logging.getLogger(__name__)

# 등록된 플러그인: {country_code: plugin_instance}
_registry: dict[str, ICountryPlugin] = {}
_default_code: str = "KR"


def register(plugin: ICountryPlugin) -> None:
    """플러그인을 레지스트리에 등록"""
    code = plugin.country_code
    _registry[code] = plugin
    logger.info("Plugin registered: %s (%s)", code, plugin.country_name)


def get(country_code: str) -> Optional[ICountryPlugin]:
    """국가 코드로 플러그인 조회"""
    return _registry.get(country_code)


def get_default() -> ICountryPlugin:
    """기본 플러그인 반환 (KR)"""
    plugin = _registry.get(_default_code)
    if plugin is None:
        raise RuntimeError(f"Default plugin '{_default_code}' not loaded")
    return plugin


def loaded_plugins() -> list[str]:
    """등록된 플러그인 국가 코드 목록"""
    return list(_registry.keys())


def load_all_plugins() -> None:
    """plugins/ 패키지 하위 모듈을 자동 스캔하여 PLUGIN 인스턴스를 등록"""
    try:
        import plugins
    except ImportError:
        logger.warning("plugins package not found")
        return

    for importer, modname, ispkg in pkgutil.iter_modules(plugins.__path__):
        if not ispkg:
            continue
        try:
            mod = importlib.import_module(f"plugins.{modname}")
            plugin_instance = getattr(mod, "PLUGIN", None)
            if plugin_instance and isinstance(plugin_instance, ICountryPlugin):
                register(plugin_instance)
            else:
                logger.warning("plugins.%s has no valid PLUGIN instance", modname)
        except Exception as e:
            logger.error("Failed to load plugin '%s': %s", modname, e)

    logger.info("Loaded %d plugin(s): %s", len(_registry), list(_registry.keys()))
