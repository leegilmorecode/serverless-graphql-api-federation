export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  AWSDate: string;
  AWSTime: string;
  AWSDateTime: string;
  AWSTimestamp: number;
  AWSEmail: string;
  AWSJSON: string;
  AWSURL: string;
  AWSPhone: string;
  AWSIPAddress: string;
};

export type QueryIdArgs = {
  id: Scalars["ID"];
};
export type NoArgs = {};

export type Orders = Order[];

export type Order = {
  __typename?: "Order";
  id?: Scalars["ID"];
  quantity: Scalars["Int"];
  productId: Scalars["String"];
  customerId: Scalars["String"];
};

export type QueryPostArgs = {
  id: Scalars["ID"];
};

export type Customer = {
  __typename?: "Customer";
  id?: Scalars["ID"];
  firstName: Scalars["String"];
  surname: Scalars["String"];
};
