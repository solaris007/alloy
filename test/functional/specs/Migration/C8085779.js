import { t } from "testcafe";
import createNetworkLogger from "../../helpers/networkLogger";
import createFixture from "../../helpers/createFixture";
import {
  compose,
  orgMainConfigMain,
  debugEnabled,
  targetMigrationEnabled
} from "../../helpers/constants/configParts";
import { TEST_PAGE, TEST_PAGE_AT_JS_ONE } from "../../helpers/constants/url";
import {
  fetchMboxOffer,
  getEcid,
  getPropositionCustomContent,
  injectAlloyAndSendEvent,
  MIGRATION_LOCATION
} from "./helper";
import getResponseBody from "../../helpers/networkLogger/getResponseBody";
import createResponse from "../../helpers/createResponse";
import migrationEnabled from "../../helpers/constants/configParts/migrationEnabled";

const favoriteColor = "green-1234";
const networkLogger = createNetworkLogger();

const config = compose(
  orgMainConfigMain,
  debugEnabled,
  migrationEnabled,
  targetMigrationEnabled
);

createFixture({
  title:
    "C8085779: Use same visitor profile in mixed mode implementation: Update profile attribute using " +
    "at.js 1.x and fetch proposition offer based on profile attr using web sdk",
  requestHooks: [
    networkLogger.edgeEndpointLogs,
    networkLogger.targetMboxJsonEndpointLogs
  ],
  url: TEST_PAGE_AT_JS_ONE,
  includeAlloyLibrary: false
});

test.meta({
  ID: "C8085779",
  SEVERITY: "P0",
  TEST_RUN: "Regression"
});

test(
  "C8085779: Use same visitor profile in mixed mode implementation: Update profile attribute using " +
    "at.js 1.x and fetch proposition offer based on profile attr using web sdk",
  async () => {
    //  delivery API request
    await fetchMboxOffer({
      params: {
        "profile.favoriteColor": favoriteColor
      }
    });
    await t
      .expect(networkLogger.targetMboxJsonEndpointLogs.count(() => true))
      .eql(2);
    const mboxJsonRequest =
      networkLogger.targetMboxJsonEndpointLogs.requests[1];
    await t.expect(mboxJsonRequest.response.statusCode).eql(200);
    const mboxRequestUrlQuery = new URL(mboxJsonRequest.request.url)
      .searchParams;
    const marketingCloudVisitorId = mboxRequestUrlQuery.get("mboxMCGVID");

    // NAVIGATE to a web sdk page
    await t.navigateTo(TEST_PAGE);
    await injectAlloyAndSendEvent(config, {
      decisionScopes: [MIGRATION_LOCATION]
    });
    const sendEventRequest = networkLogger.edgeEndpointLogs.requests[0];
    const response = JSON.parse(getResponseBody(sendEventRequest));
    const identityPayload = createResponse({
      content: response
    }).getPayloadsByType("identity:result");
    const ecid = getEcid(identityPayload)[0].id;

    // expect same ecid is used in both requests
    await t.expect(marketingCloudVisitorId).eql(ecid);
    const personalizationPayload = createResponse({
      content: response
    }).getPayloadsByType("personalization:decisions");

    const propositionCustomContent = getPropositionCustomContent(
      personalizationPayload
    );
    // expect to get a offer based on the profile attr updated in the previous call using legacy libs
    await t
      .expect(propositionCustomContent)
      .eql(`The favorite Color for this visitor is ${favoriteColor}.`);
  }
);
