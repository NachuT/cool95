import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

const PRODUCTIVE_PROMPT = `Analyze if the following activity is productive work. 
Consider activities like coding, writing, learning, or creative work as productive.
Consider activities like social media, entertainment, or idle browsing as unproductive.
Respond with only "productive" or "unproductive".`;

interface AIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const username = await verifyToken(token);
    if (!username) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // Get all cookies to analyze activity
    const allCookies = cookieStore.getAll();
    const activityData = allCookies.map(cookie => ({
      name: cookie.name,
      value: cookie.value
    }));
    
    // Ask AI to analyze if the activity is productive
    const aiResponse = await fetch('https://ai.hackclub.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: PRODUCTIVE_PROMPT },
          { role: 'user', content: JSON.stringify(activityData) }
        ]
      }),
    });
    
    if (aiResponse.ok) {
      const aiResult = await aiResponse.json() as AIResponse;
      const isProductive = aiResult.choices[0].message.content.toLowerCase().includes('productive');
      
      // Get current working time from cookies
      const workingTimeCookie = await cookieStore.get('workingTime');
      const workingData = workingTimeCookie ? JSON.parse(workingTimeCookie.value) : { lastCheck: null, totalSeconds: 0 };
      
      const currentTime = Date.now();
      let timeChange = 0;
      
      if (workingData.lastCheck) {
        const timeDiff = Math.floor((currentTime - workingData.lastCheck) / 1000);
        // If productive, add time. If unproductive, remove time
        timeChange = isProductive ? timeDiff : -timeDiff;
      }
      
      // Update working time
      const newWorkingData = {
        lastCheck: currentTime,
        totalSeconds: Math.max(0, workingData.totalSeconds + timeChange) // Prevent negative time
      };
      
      // Set the cookie with the new working time
      const response = NextResponse.json({ 
        status: 'success',
        message: isProductive ? 'Productive work detected' : 'Unproductive activity detected',
        timeChange,
        totalSeconds: newWorkingData.totalSeconds
      });
      
      response.cookies.set('workingTime', JSON.stringify(newWorkingData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 30 // 30 days
      });
      
      return response;
    } else {
      return NextResponse.json({ 
        status: 'error',
        message: 'AI service is not responding'
      }, { status: 503 });
    }
  } catch (error) {
    console.error('Error checking AI health:', error);
    return NextResponse.json({ 
      status: 'error',
      message: 'Internal server error'
    }, { status: 500 });
  }
} 