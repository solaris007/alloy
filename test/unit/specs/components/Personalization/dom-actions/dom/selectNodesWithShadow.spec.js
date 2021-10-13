/*
Copyright 2021 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

// eslint-disable-next-line max-classes-per-file
import {
  createNode,
  appendNode,
  selectNodes,
  removeNode
} from "../../../../../../../src/utils/dom";
import { selectNodesWithEq } from "../../../../../../../src/components/Personalization/dom-actions/dom";
import {
  transformPrefix,
  isShadowSelector,
  splitWithShadow
} from "../../../../../../../src/components/Personalization/dom-actions/dom/selectNodesWithShadow";

const defineCustomElements = () => {
  if (customElements.get("buy-now-button")) {
    return;
  }

  const buyNowContent = `
    <div>
      <input type="radio" id="buy" name="buy_btn" value="Buy NOW">
      <label for="buy">Buy Now</label><br>
      <div>
        <input type="radio" id="buy_later" name="buy_btn_ltr" value="Buy LATER">
        <label for="buy_later">Buy Later</label><br>
      </div>
    </div>
  `;
  customElements.define(
    "buy-now-button",
    class extends HTMLElement {
      constructor() {
        super();

        const shadowRoot = this.attachShadow({ mode: "open" });
        shadowRoot.innerHTML = buyNowContent;
      }
    }
  );

  const productOrderContent = `<div><p>Product order</p><buy-now-button>Buy</buy-now-button></div>`;
  customElements.define(
    "product-order",
    class extends HTMLElement {
      constructor() {
        super();

        const shadowRoot = this.attachShadow({ mode: "open" });
        shadowRoot.innerHTML = productOrderContent;
      }
    }
  );
};

describe("Personalization::DOM::selectNodesWithShadow", () => {
  afterEach(() => {
    selectNodes(".shadow").forEach(removeNode);
  });

  it("should select when no shadow", () => {
    appendNode(
      document.body,
      createNode("DIV", { id: "noShadow", class: "shadow" })
    );

    const result = selectNodes("#noShadow");

    expect(result[0].tagName).toEqual("DIV");
    expect(result[0].id).toEqual("noShadow");
  });

  it("should select when one shadow node", () => {
    defineCustomElements();

    const content = `
    <form id="form" action="https://www.adobe.com" method="post">
      <buy-now-button>FirstButton</buy-now-button>
      <buy-now-button>SecondButton</buy-now-button>
      <input type="submit" value="Submit"/>
    </form>`;

    appendNode(
      document.body,
      createNode("DIV", { id: "abc", class: "shadow" }, { innerHTML: content })
    );

    const result = selectNodesWithEq(
      "#abc:eq(0) > FORM:nth-of-type(1) > BUY-NOW-BUTTON:nth-of-type(2):shadow > DIV:nth-of-type(1) > LABEL:nth-of-type(1)"
    );

    expect(result.length).toEqual(1);

    expect(result[0].tagName).toEqual("LABEL");
    expect(result[0].textContent).toEqual("Buy Now");
  });

  it("should select when multiple nested shadow nodes", () => {
    defineCustomElements();

    const content = `
    <form id="form" action="https://www.adobe.com" method="post">
      <buy-now-button>FirstButton</buy-now-button>
      <buy-now-button>SecondButton</buy-now-button>
      <product-order>FirstOrder</product-order>
      <product-order>SecondOrder</product-order>
      <input type="submit" value="Submit"/>
    </form>`;

    appendNode(
      document.body,
      createNode("DIV", { id: "abc", class: "shadow" }, { innerHTML: content })
    );

    const result = selectNodesWithEq(
      "#abc:eq(0) > FORM:nth-of-type(1) > PRODUCT-ORDER:nth-of-type(2):shadow > *:eq(0) > BUY-NOW-BUTTON:nth-of-type(1):shadow > DIV:nth-of-type(1) > LABEL:nth-of-type(1)"
    );

    expect(result[0].tagName).toEqual("LABEL");
    expect(result[0].textContent).toEqual("Buy Now");
  });
});

describe("Personalization::DOM::selectNodesWithShadow:helpers", () => {
  it("should detect shadow selectors", () => {
    let selector =
      "BODY > BUY-NOW-BUTTON:nth-of-type(2):shadow > DIV:nth-of-type(1)";
    let result = isShadowSelector(selector);
    expect(result).toBeTrue();
    selector = "BODY > BUY-NOW-BUTTON:nth-of-type(2) > DIV:nth-of-type(1)";
    result = isShadowSelector(selector);
    expect(result).toBeFalse();
  });

  it("should split shadow selectors", () => {
    const selector =
      "BODY > BUY-NOW-BUTTON:nth-of-type(2):shadow > DIV:nth-of-type(1)";
    const parts = splitWithShadow(selector);
    expect(parts[0]).toEqual("BODY > BUY-NOW-BUTTON:nth-of-type(2)");
    expect(parts[1]).toEqual(" > DIV:nth-of-type(1)");
  });

  it("should transform selector prefix", () => {
    let selector = " > BUY-NOW-BUTTON:nth-of-type(2)";
    let result = transformPrefix(selector);
    expect(result).toEqual(":scope > BUY-NOW-BUTTON:nth-of-type(2)");
    selector = ">  BUY-NOW-BUTTON:nth-of-type(2)";
    result = transformPrefix(selector);
    expect(result).toEqual(":scope >  BUY-NOW-BUTTON:nth-of-type(2)");
    selector = ">BUY-NOW-BUTTON:nth-of-type(2)";
    result = transformPrefix(selector);
    expect(result).toEqual(":scope >BUY-NOW-BUTTON:nth-of-type(2)");
  });
});
