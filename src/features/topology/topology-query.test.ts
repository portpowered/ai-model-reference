import { describe, expect, test } from "bun:test";
import {
  buildTopologyHref,
  getDefaultTopologySelectors,
  parseTopologyQuery,
  TOPOLOGY_CLASSIFICATION_QUERY_KEY,
} from "./topology-query";

describe("topology query helpers", () => {
  test("uses the default topology selection when the URL has no classification parameter", () => {
    expect(parseTopologyQuery(new URLSearchParams())).toEqual({
      selectors: getDefaultTopologySelectors(),
      usesDefault: true,
    });
  });

  test("parses repeated and comma-delimited classification selectors", () => {
    expect(
      parseTopologyQuery(
        new URLSearchParams(
          `${TOPOLOGY_CLASSIFICATION_QUERY_KEY}=feed-forward&${TOPOLOGY_CLASSIFICATION_QUERY_KEY}=activation,activation-function`,
        ),
      ),
    ).toEqual({
      selectors: ["feed-forward", "activation", "activation-function"],
      usesDefault: false,
    });
  });

  test("preserves explicit empty selections", () => {
    expect(
      parseTopologyQuery(
        new URLSearchParams(`${TOPOLOGY_CLASSIFICATION_QUERY_KEY}=`),
      ),
    ).toEqual({
      selectors: [],
      usesDefault: false,
    });
  });

  test("clears the query string for the default view and preserves explicit empty URLs", () => {
    expect(
      buildTopologyHref(
        "/topology",
        getDefaultTopologySelectors(),
        new URLSearchParams("foo=bar"),
      ),
    ).toBe("/topology?foo=bar");

    expect(
      buildTopologyHref("/topology", [], new URLSearchParams(), {
        explicitEmpty: true,
      }),
    ).toBe("/topology?classification=");
  });

  test("canonicalizes compatibility selectors and canonical ids when writing topology URLs", () => {
    expect(
      buildTopologyHref(
        "/topology",
        ["feed-forward", "classification.module.activation"],
        new URLSearchParams(),
      ),
    ).toBe(
      "/topology?classification=feed-forward-networks&classification=activation-functions",
    );
  });
});
