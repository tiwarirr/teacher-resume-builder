import { RequireAuth } from "@/components/RequireAuth";
import { TailorPanel } from "@/components/TailorPanel";

export default async function TailorResumePage(props: PageProps<"/resumes/[id]/tailor">) {
  const { id } = await props.params;
  return (
    <RequireAuth>
      <TailorPanel resumeId={id} />
    </RequireAuth>
  );
}
