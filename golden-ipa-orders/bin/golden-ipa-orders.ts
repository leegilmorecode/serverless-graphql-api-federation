#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { GoldenIpaOrdersStatefulStack } from "../stateful/golden-ipa-orders-stateful-stack";
import { GoldenIpaOrdersStatelessStack } from "../stateless/golden-ipa-orders-stateless-stack";

const app = new cdk.App();

const statefulStack: GoldenIpaOrdersStatefulStack =
  new GoldenIpaOrdersStatefulStack(app, "GoldenIpaOrdersStatefulStack", {});

new GoldenIpaOrdersStatelessStack(app, "GoldenIpaOrdersStatelessStack", {
  vpc: statefulStack.ordersVpc,
  table: statefulStack.ordersTable,
  accountId: cdk.Aws.ACCOUNT_ID,
  region: cdk.Aws.REGION,
});
