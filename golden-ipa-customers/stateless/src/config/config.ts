import convict = require("convict");

export const config = convict({
  ddbTableName: {
    doc: "The dynamodb table name.",
    default: "development",
    env: "TABLE_NAME",
  },
});
