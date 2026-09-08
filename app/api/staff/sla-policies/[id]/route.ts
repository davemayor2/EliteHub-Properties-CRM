import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { ComplaintPriority } from '@/types/complaint';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const VALID_PRIORITIES: ComplaintPriority[] = ['low', 'normal', 'high', 'urgent'];

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { data: policy, error } = await supabase
      .from('sla_policies')
      .select(`
        *,
        department:departments(id, name)
      `)
      .eq('id', id)
      .single();

    if (error || !policy) {
      return NextResponse.json({ success: false, message: 'SLA policy not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, policy });
  } catch (err) {
    console.error('[API SLA Policy GET Exception]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.authorized) {
      return NextResponse.json({ success: false, message: authCheck.message }, { status: authCheck.status });
    }

    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json().catch(() => ({}));

    const {
      name,
      description,
      priority,
      department_id,
      first_response_hours,
      resolution_hours,
      warning_percentage,
      auto_escalate,
      is_active,
    } = body;

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) {
      if (!name || typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ success: false, message: 'Policy name cannot be empty.' }, { status: 400 });
      }
      updates.name = name.trim();
    }

    if (description !== undefined) {
      updates.description = description?.trim() || null;
    }

    if (priority !== undefined) {
      if (priority && !VALID_PRIORITIES.includes(priority as ComplaintPriority)) {
        return NextResponse.json({ success: false, message: `Invalid priority: ${priority}` }, { status: 400 });
      }
      updates.priority = priority || null;
    }

    if (department_id !== undefined) {
      updates.department_id = department_id || null;
    }

    if (first_response_hours !== undefined) {
      const hours = Number(first_response_hours);
      if (isNaN(hours) || hours <= 0) {
        return NextResponse.json({ success: false, message: 'First response target must be greater than 0.' }, { status: 400 });
      }
      updates.first_response_hours = Math.round(hours);
    }

    if (resolution_hours !== undefined) {
      const hours = Number(resolution_hours);
      if (isNaN(hours) || hours <= 0) {
        return NextResponse.json({ success: false, message: 'Resolution target must be greater than 0.' }, { status: 400 });
      }
      updates.resolution_hours = Math.round(hours);
    }

    if (warning_percentage !== undefined) {
      const pct = Number(warning_percentage);
      if (isNaN(pct) || pct <= 0 || pct > 100) {
        return NextResponse.json({ success: false, message: 'Warning percentage must be between 1 and 100%.' }, { status: 400 });
      }
      updates.warning_percentage = Math.round(pct);
    }

    if (auto_escalate !== undefined) {
      updates.auto_escalate = Boolean(auto_escalate);
    }

    if (is_active !== undefined) {
      updates.is_active = Boolean(is_active);
    }

    const { data: updatedPolicy, error: updateErr } = await supabase
      .from('sla_policies')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        department:departments(id, name)
      `)
      .single();

    if (updateErr || !updatedPolicy) {
      console.error('[API SLA Policy PATCH Error]:', updateErr);
      return NextResponse.json({ success: false, message: updateErr?.message || 'Failed to update SLA policy.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'SLA policy updated successfully.',
      policy: updatedPolicy,
    });
  } catch (err) {
    console.error('[API SLA Policy PATCH Exception]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authCheck = await requireAdmin();
    if (!authCheck.authorized) {
      return NextResponse.json({ success: false, message: authCheck.message }, { status: authCheck.status });
    }

    const { id } = await params;
    const supabase = await createClient();

    // Soft deactivate instead of permanent destructive delete to preserve historical records
    const { error: updateErr } = await supabase
      .from('sla_policies')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateErr) {
      console.error('[API SLA Policy DELETE Error]:', updateErr);
      return NextResponse.json({ success: false, message: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'SLA policy deactivated successfully.',
    });
  } catch (err) {
    console.error('[API SLA Policy DELETE Exception]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 });
  }
}
