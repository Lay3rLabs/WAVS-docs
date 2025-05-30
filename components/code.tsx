import { Pre, RawCode, highlight } from "codehike/code";
import { callout } from "./annotations/callout";
import { CopyButton } from "./button";
import { hover } from "./annotations/code-mentions";
import { diff } from "./annotations/diff";
import { mark } from "./annotations/mark";
import {
  collapse,
  collapseContent,
  collapseTrigger,
} from "./annotations/collapse";
import { focus } from "./annotations/focus";
import { lineNumbers } from "./annotations/line-numbers";

import { link } from "./annotations/link";
import { tokenTransitions } from "./annotations/token-transitions";
import { wordWrap } from "./annotations/word-wrap";

export async function Code({ codeblock }: { codeblock: RawCode }) {
  const highlighted = await highlight(codeblock, "min-dark");

  // Extract the filename/title from meta value, handling cases with docci commands
  const displayMeta = highlighted.meta ? (() => {
    // Split by spaces to handle both formats:
    // "docci-ignore filename" or "filename docci-ignore"
    const parts = highlighted.meta.split(' ');
    
    // Find the part that doesn't start with 'docci'
    const title = parts.find(part => !part.startsWith('docci'));
    
    return title || null;
  })() : null;

  return (
    <div className="border rounded relative">
{displayMeta && (
  <div className="text-center text-zinc-400 text-sm min-h-[2rem] flex items-center justify-center">
    {displayMeta}
  </div>
)}
      <Pre
        code={highlighted}
        handlers={[
          callout,
          hover,
          diff,
          mark,
          collapse,
          collapseTrigger,
          collapseContent,
          focus,
          // lineNumbers,
          link,
          tokenTransitions,
          wordWrap
        ]}
        className="m-0 bg-card rounded"
      />
            <CopyButton text={highlighted.code} />
    </div>
  );
}

