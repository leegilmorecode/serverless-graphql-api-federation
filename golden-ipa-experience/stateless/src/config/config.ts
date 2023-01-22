import convict = require("convict");

export const config = convict({
  customersDomainUrl: {
    doc: "The private API for the customer domain.",
    env: "CUSTOMERS_DOMAIN_URL",
    default: "development",
  },
  ordersDomainUrl: {
    doc: "The private API for the order domain.",
    env: "ORDERS_DOMAIN_URL",
    default: "development",
  },
});
