import { NextRequest, NextResponse } from 'next/server';
import type { UserProfile } from '@/lib/types';

const DEFAULT_USER: UserProfile = {
  id: 'user_reachinbox_primary',
  name: 'Nikhil K',
  email: 'nk10nikhil@gmail.com',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
};

export async function GET() {
  return NextResponse.json({
    authenticated: true,
    user: DEFAULT_USER,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, name, avatar } = body;

    if (action === 'logout') {
      return NextResponse.json({
        authenticated: false,
        user: null,
      });
    }

    const user: UserProfile = {
      id: `user_${Date.now()}`,
      name: name || 'Nikhil K',
      email: email || 'nk10nikhil@gmail.com',
      avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    };

    return NextResponse.json({
      authenticated: true,
      user,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
