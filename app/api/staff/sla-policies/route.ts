import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ComplaintPriority } from '@/types/complaint';

const VALID_PRIORITIES: ComplaintPriority[] = ['low', 'normal', 'high', 'urgent'];

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { data: policies, error } = await supabase
      .from('sla_policies')
      .select(`
        *,
        department:departments(id, name)
      `)
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === 'PGRST205') {
        return NextResponse.json({ success: true, policies: [] });
      }
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, policies: policies || [] });
  } catch (err) {
    console.error('[API /api/staff/sla-policies GET Exception]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin' || (profile.is_active !== undefined && !profile.is_active)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: Admin access required.' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      name,
      description,
      priority,
      department_id,
      first_response_hours,
      resolution_hours,
      warning_percentage = 75,
      auto_escalate = true,
      is_active = true,
    } = body;

    // Validations
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, message: 'Policy name is required.' }, { status: 400 });
    }

    const firstHours = Number(first_response_hours);
    const resHours = Number(resolution_hours);
    const warnPct = Number(warning_percentage);

    if (isNaN(firstHours) || firstHours <= 0) {
      return NextResponse.json({ success: false, message: 'First response target must be greater than 0 hours.' }, { status: 400 });
    }

    if (isNaN(resHours) || resHours <= 0) {
      return NextResponse.json({ success: false, message: 'Resolution target must be greater than 0 hours.' }, { status: 400 });
    }

    if (resHours < firstHours) {
      return NextResponse.json({ success: false, message: 'Resolution target cannot be shorter than first response target.' }, { status: 400 });
    }

    if (isNaN(warnPct) || warnPct <= 0 || warnPct > 100) {
      return NextResponse.json({ success: false, message: 'Warning percentage must be between 1 and 100%.' }, { status: 400 });
    }

    if (priority && !VALID_PRIORITIES.includes(priority as ComplaintPriority)) {
      return NextResponse.json({ success: false, message: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` }, { status: 400 });
    }

    // Check for duplicate active policy with matching scope
    let dupQuery = supabase
      .from('sla_policies')
      .select('id, name')
      .eq('is_active', true);

    if (department_id) {
      dupQuery = dupQuery.eq('department_id', department_id);
    } else {
      dupQuery = dupQuery.is('department_id', null);
    }

    if (priority) {
      dupQuery = dupQuery.eq('priority', priority);
    } else {
      dupQuery = dupQuery.is('priority', null);
    }

    const { data: existingDup } = await dupQuery.limit(1);
    if (existingDup && existingDup.length > 0) {
      return NextResponse.json(
        { success: false, message: `An active SLA policy ("${existingDup[0].name}") already exists for this department and priority combination.` },
        { status: 409 }
      );
    }

    const { data: newPolicy, error: insertErr } = await supabase
      .from('sla_policies')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        priority: priority || null,
        department_id: department_id || null,
        first_response_hours: Math.round(firstHours),
        resolution_hours: Math.round(resHours),
        warning_percentage: Math.round(warnPct),
        auto_escalate: Boolean(auto_escalate),
        is_active: Boolean(is_active),
      })
      .select(`
        *,
        department:departments(id, name)
      `)
      .single();

    if (insertErr || !newPolicy) {
      console.error('[API SLA Policies POST Insert Error]:', insertErr);
      return NextResponse.json({ success: false, message: insertErr?.message || 'Failed to create SLA policy.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'SLA policy created successfully.',
      policy: newPolicy,
    });
  } catch (err) {
    console.error('[API /api/staff/sla-policies POST Exception]:', err);
    return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 });
  }
}
