const crypto = require('crypto');

function verifyShopifyHmac(data, hmac) {
  const secret = process.env.SHOPIFY_API_SECRET;
  const hash = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(hmac)
  );
}

function verifyShopifyWebhook(data, hmacHeader) {
  const secret = process.env.SHOPIFY_API_SECRET;
  const hash = crypto
    .createHmac('sha256', secret)
    .update(data, 'utf8')
    .digest('base64');

  return hash === hmacHeader;
}

module.exports = { verifyShopifyHmac, verifyShopifyWebhook };
