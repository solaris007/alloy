import { t, ClientFunction } from "testcafe";
import createNetworkLogger from "../../helpers/networkLogger";
import getResponseBody from "../../helpers/networkLogger/getResponseBody";
import { responseStatus } from "../../helpers/assertions";
import createFixture from "../../helpers/createFixture";
import createResponse from "../../helpers/createResponse";
import {
  compose,
  orgMainConfigMain,
  debugEnabled,
  migrationEnabled
} from "../../helpers/constants/configParts";
import createAlloyProxy from "../../helpers/createAlloyProxy";

const config = compose(orgMainConfigMain, debugEnabled, migrationEnabled);

const networkLogger = createNetworkLogger();

createFixture({
  title:
    "C14399: When ID migration is enabled and no identity cookie is found but legacy s_ecid cookie is found, the ECID will be sent on the request",
  requestHooks: [networkLogger.edgeEndpointLogs]
});

test.meta({
  ID: "C14399",
  SEVERITY: "P0",
  TEST_RUN: "Regression"
});

const setEcidCookie = ClientFunction(() => {
  document.cookie = "s_ecid=MCMID%7C16908443662402872073525706953453086963";
});

const getDocumentCookie = ClientFunction(() => document.cookie);

test("Test C14399: When ID migration is enabled and no identity cookie is found but legacy s_ecid cookie is found, the ECID will be sent on the request", async () => {
  await setEcidCookie();
  const alloy = createAlloyProxy();
  await alloy.configure(config);
  await alloy.sendEvent({ renderDecisions: true });

  await responseStatus(networkLogger.edgeEndpointLogs.requests, 200);
  await t.expect(networkLogger.edgeEndpointLogs.requests.length).eql(1);

  const request = JSON.parse(
    networkLogger.edgeEndpointLogs.requests[0].request.body
  );

  await t
    .expect(request.xdm.identityMap.ECID[0].id)
    .eql("16908443662402872073525706953453086963");

  const response = JSON.parse(
    getResponseBody(networkLogger.edgeEndpointLogs.requests[0])
  );

  const payloads = createResponse({ content: response }).getPayloadsByType(
    "identity:result"
  );

  const ecidPayload = payloads.filter(
    payload => payload.namespace.code === "ECID"
  )[0];

  await t.expect(ecidPayload.id).eql("16908443662402872073525706953453086963");

  const documentCookie = await getDocumentCookie();

  await t
    .expect(documentCookie)
    .contains("s_ecid=MCMID%7C16908443662402872073525706953453086963");
});
