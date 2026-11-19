import { App } from "@/components/App";
import { Narrative } from "@/components/Narrative";

export default function Page() {
  return <App narrative={<Narrative />} />;
}
