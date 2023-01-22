#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { GoldenIpaExperienceStatefulStack } from "../stateful/golden-ipa-experience-stateful-stack";
import { GoldenIpaExperienceStatelessStack } from "../stateless/golden-ipa-experience-stateless-stack";

const app = new cdk.App();

const goldenIpaExperienceStatefulStack = new GoldenIpaExperienceStatefulStack(
  app,
  "GoldenIpaExperiencStatefulStack",
  {}
);

// import the exported values from the orders and customers stacks
new GoldenIpaExperienceStatelessStack(app, "GoldenIpaExperiencStatelessStack", {
  ordersDomainUrl: cdk.Fn.importValue("InternalOrdersApiUrl"),
  customersDomainUrl: cdk.Fn.importValue("InternalCustomersApiUrl"),
  ordersDomainExecutionArn: cdk.Fn.importValue("internalOrdersApiArnToExecute"),
  customersDomainExecutionArn: cdk.Fn.importValue(
    "internalCustomersApiArnToExecute"
  ),
  region: cdk.Aws.REGION,
  vpc: goldenIpaExperienceStatefulStack.vpc,
});
