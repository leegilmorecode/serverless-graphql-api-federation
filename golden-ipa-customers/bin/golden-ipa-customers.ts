#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { GoldenIpaCustomersStatefulStack } from "../stateful/golden-ipa-customers-stateful-stack";
import { GoldenIpaCustomersStatelessStack } from "../stateless/golden-ipa-customers-stateless-stack";

const app = new cdk.App();

const statefulStack: GoldenIpaCustomersStatefulStack =
  new GoldenIpaCustomersStatefulStack(
    app,
    "GoldenIpaCustomersStatefulStack",
    {}
  );

new GoldenIpaCustomersStatelessStack(app, "GoldenIpaCustomersStatelessStack", {
  vpc: statefulStack.customersVpc,
  table: statefulStack.customersTable,
  accountId: cdk.Aws.ACCOUNT_ID,
  region: cdk.Aws.REGION,
});
