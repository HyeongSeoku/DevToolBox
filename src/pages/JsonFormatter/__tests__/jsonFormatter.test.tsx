import { fireEvent, render, screen } from "@testing-library/react";

import { JsonFormatterPage } from "../index";

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// @ts-ignore
global.ResizeObserver = ResizeObserver;

describe("JsonFormatterPage", () => {
  const typeJson = (value: string) => {
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value } });
  };

  const clickButton = (label: string) => {
    fireEvent.click(screen.getByRole("button", { name: label }));
  };

  const expectOutput = (expected: string) => {
    const matches = screen.getAllByText(
      (_, node) => node?.textContent === expected,
    );
    expect(matches.length).toBeGreaterThan(0);
  };

  it("prettifies valid JSON", () => {
    render(<JsonFormatterPage />);
    typeJson('{"hello":"world"}');
    clickButton("Format");
    expectOutput('{\n  "hello": "world"\n}');
  });

  it("handles JS-style single quotes and trailing comma", () => {
    render(<JsonFormatterPage />);
    typeJson("{ foo: 'bar', }");
    clickButton("Format");
    expectOutput('{\n  "foo": "bar"\n}');
  });

  it("wraps bare Korean key/value when JS 스타일 허용", () => {
    render(<JsonFormatterPage />);
    typeJson("{ 테스트:이름 }");
    clickButton("Format");
    expectOutput('{\n  "테스트": "이름"\n}');
  });

  it("wraps bare value with Korean characters (e.g., ㄱㄴ)", () => {
    render(<JsonFormatterPage />);
    typeJson("{ name:ㄱㄴ }");
    clickButton("Format");
    expectOutput('{\n  "name": "ㄱㄴ"\n}');
  });

  it("keeps booleans and numbers without quoting", () => {
    render(<JsonFormatterPage />);
    typeJson("{ isOk:true, count:10 }");
    clickButton("Format");
    expectOutput('{\n  "isOk": true,\n  "count": 10\n}');
  });

  it("minifies but preserves null and numbers", () => {
    render(<JsonFormatterPage />);
    typeJson("{ value:null, num:3.14 }");
    clickButton("Minify");
    expectOutput('{"value":null,"num":3.14}');
  });

  it("sorts keys when Beautify + Sort is clicked", () => {
    render(<JsonFormatterPage />);
    typeJson("{ z:1, a:2 }");
    clickButton("Beautify + Sort");
    expectOutput('{\n  "a": 2,\n  "z": 1\n}');
  });

  it("minifies JSON", () => {
    render(<JsonFormatterPage />);
    typeJson("{ foo: 'bar', baz: 1 }");
    clickButton("Minify");
    expectOutput('{"foo":"bar","baz":1}');
  });
});
