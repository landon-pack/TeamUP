/**
 * /api/admin/records/:id
 *
 * Update or delete one project.
 * Delete removes the project row only. Lifetime project, task, and milestone totals stay put.
 */

import { deleteAdminRecord, requireAdmin, updateAdminRecord } from '@/lib/admin';

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireAdmin();
  if (!access.ok) return access.response;
  const { id } = await context.params;
  try {
    const body = (await req.json()) as {
      title?: string;
      course?: string;
      deadline?: string;
      description?: string;
      ownerId?: string;
      memberIds?: string[];
    };
    const updated = await updateAdminRecord(access.db, id, body);
    if (!updated.ok) {
      const status = updated.error === 'That project was not found.' ? 404 : 400;
      return Response.json({ error: updated.error }, { status });
    }
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Admin record update failed', error instanceof Error ? error.message : error);
    return Response.json({ error: 'Unable to save that project.' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requireAdmin();
  if (!access.ok) return access.response;
  const { id } = await context.params;
  try {
    const removed = await deleteAdminRecord(access.db, id, access.adminId);
    if (!removed.ok) return Response.json({ error: removed.error }, { status: 404 });
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Admin record delete failed', error instanceof Error ? error.message : error);
    return Response.json({ error: 'Unable to delete that project.' }, { status: 500 });
  }
}
