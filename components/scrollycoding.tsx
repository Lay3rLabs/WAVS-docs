import { z } from "zod";
import {
  Selection,
  Selectable,
  SelectionProvider,
} from "codehike/utils/selection";
import { Block, CodeBlock, parseProps } from "codehike/blocks";
import { Code } from "./code";

const Schema = Block.extend({
  steps: z.array(Block.extend({ code: CodeBlock })),
});

export function Scrollycoding(props: unknown) {
  const { steps } = parseProps(props, Schema);

  return (
    <SelectionProvider className="flex gap-4">
      {/* Left Side: Steps */}
      <div className="flex-1 mt-32 mb-[90vh] ml-2 prose">
        {steps.map((step, i) => (
          <Selectable
            key={i}
            index={i}
            selectOn={["click", "scroll"]}
            className="border-l-4 data-[selected=true]:border-[hsl(278,16%,59%)] px-5 py-2 mb-24 rounded bg-card"
          >
            <h2 className="mt-4 text-xl">{step.title}</h2>
            <div>{step.children}</div>
          </Selectable>
        ))}
      </div>

      {/* Right Side: Code */}
      <div className="w-[45vw] max-w-[55vw]">
        <div className="top-16 sticky max-h-[calc(100vh-100px)] overflow-auto">
          <Selection
            from={steps.map((step) => (
              <Code codeblock={step.code} />
            ))}
          />
        </div>
      </div>
    </SelectionProvider>
  );
}
