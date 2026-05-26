import { signOutAction } from "@/app/(auth)/actions"

export async function POST() {
  await signOutAction()
}
