import { RequireAuth } from "@/components/RequireAuth";
import { CoverLetterPanel } from "@/components/CoverLetterPanel";

export default async function CoverLetterPage(props: PageProps<"/resumes/[id]/cover-letter">) {
  const { id } = await props.params;
  return (
    <RequireAuth>
      <CoverLetterPanel resumeId={id} />
    </RequireAuth>
  );
}
