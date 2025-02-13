import { t } from "testcafe";
import createNetworkLogger from "../../helpers/networkLogger";
import { responseStatus } from "../../helpers/assertions/index";
import createFixture from "../../helpers/createFixture";
import {
  compose,
  orgMainConfigMain,
  debugEnabled
} from "../../helpers/constants/configParts";
import getResponseBody from "../../helpers/networkLogger/getResponseBody";
import createResponse from "../../helpers/createResponse";
import { TEST_PAGE as TEST_PAGE_URL } from "../../helpers/constants/url";
import createAlloyProxy from "../../helpers/createAlloyProxy";

const networkLogger = createNetworkLogger();
const config = compose(orgMainConfigMain, debugEnabled);
const PAGE_WIDE_SCOPE = "__view__";
const decisionContent =
  '<div id="C28755">Here is an awesome target offer!</div>';

createFixture({
  title:
    "C6364797: applyPropositions should render page-wide propositions that have not previously been rendered",
  requestHooks: [networkLogger.edgeEndpointLogs],
  url: `${TEST_PAGE_URL}?test=C28755`
});

test.meta({
  ID: "C6364797",
  SEVERITY: "P0",
  TEST_RUN: "Regression"
});

test("Test C6364797: applyPropositions should render page-wide propositions that have not previously been rendered", async () => {
  const alloy = createAlloyProxy();
  await alloy.configure(config);
  const result = await alloy.sendEvent();

  await responseStatus(networkLogger.edgeEndpointLogs.requests, 200);

  await t.expect(networkLogger.edgeEndpointLogs.requests.length).eql(1);

  const request = networkLogger.edgeEndpointLogs.requests[0];
  const requestBody = JSON.parse(request.request.body);
  const personalizationSchemas =
    requestBody.events[0].query.personalization.schemas;

  await t
    .expect(requestBody.events[0].query.personalization.decisionScopes)
    .eql([PAGE_WIDE_SCOPE]);

  const results = [
    "https://ns.adobe.com/personalization/default-content-item",
    "https://ns.adobe.com/personalization/dom-action",
    "https://ns.adobe.com/personalization/html-content-item",
    "https://ns.adobe.com/personalization/json-content-item",
    "https://ns.adobe.com/personalization/redirect-item"
  ].every(schema => personalizationSchemas.includes(schema));

  await t.expect(results).eql(true);

  const response = JSON.parse(
    getResponseBody(networkLogger.edgeEndpointLogs.requests[0])
  );
  const personalizationPayload = createResponse({
    content: response
  }).getPayloadsByType("personalization:decisions");

  await t.expect(personalizationPayload[0].scope).eql(PAGE_WIDE_SCOPE);
  await t
    .expect(personalizationPayload[0].items[0].data.content)
    .eql(decisionContent);

  await t.expect(result.decisions[0].renderAttempted).eql(undefined);
  await t.expect(result.propositions[0].renderAttempted).eql(false);
  await t.expect(result.decisions.length).eql(1);
  await t.expect(result.decisions[0].scope).eql(PAGE_WIDE_SCOPE);
  await t
    .expect(result.decisions[0].items[0].data.content)
    .eql(decisionContent);

  const applyPropositionsResult = await alloy.applyPropositions({
    propositions: result.propositions
  });

  const allPropositionsWereRendered = applyPropositionsResult.propositions.every(
    proposition => proposition.renderAttempted
  );
  await t.expect(allPropositionsWereRendered).eql(true);
  await t
    .expect(applyPropositionsResult.propositions.length)
    .eql(result.propositions.length);
  // make sure no new network requests are sent - applyPropositions is a client-side only command.
  await t.expect(networkLogger.edgeEndpointLogs.requests.length).eql(1);
});
