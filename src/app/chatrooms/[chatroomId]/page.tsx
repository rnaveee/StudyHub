export default async function ChatroomPage({
  params,
}: {
  params: Promise<{ chatroomId: string }>;
}) {
  const { chatroomId } = await params;

  return (
    <section className="px-4 py-6 sm:px-6 lg:px-8">
      <div>jork</div>
    </section>
  );
}
