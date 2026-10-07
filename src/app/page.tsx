import { Suspense } from "react";
import { JobBoardApp } from "@/components/JobBoardApp";

export default function Home() {
  return (
    // The board reads its filters from the URL, which is only known in the browser.
    <Suspense>
      <JobBoardApp />
    </Suspense>
  );
}
