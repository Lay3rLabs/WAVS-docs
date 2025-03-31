import { Block, CodeBlock, parseProps } from "codehike/blocks";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { highlight, Pre, RawCode } from "codehike/code";
import { callout } from "./annotations/callout";
import { hover } from "./annotations/code-mentions";
import { diff } from "./annotations/diff";
import { mark } from "./annotations/mark";
import {
  collapse,
  collapseContent,
  collapseTrigger,
} from "./annotations/collapse";
import { lineNumbers } from "./annotations/line-numbers";
import { focus } from "./annotations/focus";
import { link } from "./annotations/link";
import { tokenTransitions } from "./annotations/token-transitions";
import { wordWrap } from "./annotations/word-wrap";

export async function CodeTabs(props: { tabs: RawCode[] }) {
  const { tabs } = props;
  const highlighted = await Promise.all(
    tabs.map((tab) => highlight(tab, "slack-dark"))
  );
  return (
    <Tabs defaultValue={tabs[0]?.meta} className="dark rounded">
      <TabsList className="rounded-none">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.meta} value={tab.meta}>
            {tab.meta}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab, i) => (
        <TabsContent key={tab.meta} value={tab.meta} className="mt-0">
          <Pre
            code={highlighted[i]}
            handlers={[
              callout,
              hover,
              diff,
              mark,
              collapse,
              collapseTrigger,
              collapseContent,
              focus,
              lineNumbers,
              link,
              tokenTransitions,
              wordWrap,
            ]}
            className="m-0 bg-card"
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
const Schema = Block.extend({ tabs: z.array(CodeBlock) });
export async function CodeWithTabs(props: unknown) {
  const { tabs } = parseProps(props, Schema);
  return <CodeTabs tabs={tabs} />;
}
