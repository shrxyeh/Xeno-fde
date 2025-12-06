const axios = require("axios");

class ShopifyService {
  constructor(shopDomain, accessToken) {
    this.shopDomain = shopDomain;
    this.accessToken = accessToken;
    this.baseUrl = `https://${shopDomain}/admin/api/2024-01`;
  }

  async makeRequest(endpoint, method = "GET", data = null) {
    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          "X-Shopify-Access-Token": this.accessToken,
          "Content-Type": "application/json",
        },
        data,
      });
      return response.data;
    } catch (error) {
      console.error(
        `Shopify API Error: ${endpoint}`,
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async getCustomers(limit = 250) {
    const customers = [];
    let nextPageInfo = null;

    do {
      const endpoint = nextPageInfo
        ? `/customers.json?limit=${limit}&page_info=${nextPageInfo}`
        : `/customers.json?limit=${limit}`;

      const data = await this.makeRequest(endpoint);
      customers.push(...data.customers);

      // Check for pagination (Link header)
      nextPageInfo = this.extractNextPageInfo(data);
    } while (nextPageInfo && customers.length < 1000);

    return customers;
  }

  async getProducts(limit = 250) {
    const products = [];
    let nextPageInfo = null;

    do {
      const endpoint = nextPageInfo
        ? `/products.json?limit=${limit}&page_info=${nextPageInfo}`
        : `/products.json?limit=${limit}`;

      const data = await this.makeRequest(endpoint);
      products.push(...data.products);

      nextPageInfo = this.extractNextPageInfo(data);
    } while (nextPageInfo && products.length < 1000);

    return products;
  }

  async getOrders(limit = 250, status = "any") {
    const orders = [];
    let nextPageInfo = null;

    do {
      const endpoint = nextPageInfo
        ? `/orders.json?limit=${limit}&status=${status}&page_info=${nextPageInfo}`
        : `/orders.json?limit=${limit}&status=${status}`;

      const data = await this.makeRequest(endpoint);
      orders.push(...data.orders);

      nextPageInfo = this.extractNextPageInfo(data);
    } while (nextPageInfo && orders.length < 1000);

    return orders;
  }

  extractNextPageInfo(response) {
    // Simplified - Shopify returns pagination in Link header
    // For this assignment, we'll just return null after first page
    return null;
  }
}

module.exports = ShopifyService;
