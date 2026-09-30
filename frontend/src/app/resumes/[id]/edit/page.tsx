import { RequireAuth } from "@/components/RequireAuth";
import { ResumeEditor } from "@/components/ResumeEditor";

export default async function EditResumePage(props: PageProps<"/resumes/[id]/edit">) {
  const { id } = await props.params;
  return (
    <RequireAuth>
      <ResumeEditor resumeId={id} />
    </RequireAuth>
  );
}
