var PUBLIC_BOOTSTRAP_CACHE_KEY = 'sme-om:public-bootstrap:v2';
var PUBLIC_BOOTSTRAP_CACHE_SECONDS = 90;

function getPublicBootstrap() {
  var cache = CacheService.getScriptCache();
  try {
    var cached = cache.get(PUBLIC_BOOTSTRAP_CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    // Cache is only a speed optimization.
  }

  var data = {
    settings: getShopSettingsPublic(),
    products: getProducts({}).products,
    server_time: nowString()
  };

  try {
    var serialized = JSON.stringify(data);
    // Apps Script cache values are size-limited. Skip caching unusually large catalogs.
    if (serialized.length < 90000) {
      cache.put(PUBLIC_BOOTSTRAP_CACHE_KEY, serialized, PUBLIC_BOOTSTRAP_CACHE_SECONDS);
    }
  } catch (err) {
    // Never block the storefront because the cache is unavailable.
  }

  return data;
}

function invalidatePublicDataCache() {
  try {
    CacheService.getScriptCache().remove(PUBLIC_BOOTSTRAP_CACHE_KEY);
  } catch (err) {
    // Mutations must still succeed if cache invalidation is unavailable.
  }
}
