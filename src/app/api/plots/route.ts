import { NextRequest, NextResponse } from 'next/server';
import { amalgamatePlots, getAllPlots, updatePlotRecord } from '@/lib/store';

export async function GET() {
  try {
    const plots = await getAllPlots();
    return NextResponse.json({ success: true, plots });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error fetching plots';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'amalgamate') {
      const { primaryPlotNumber, secondaryPlotNumbers, unifiedPlotNumber } = body;
      if (!primaryPlotNumber || !secondaryPlotNumbers || !unifiedPlotNumber) {
        return NextResponse.json(
          { error: 'Missing amalgamation plot numbers' },
          { status: 400 }
        );
      }

      const result = await amalgamatePlots(primaryPlotNumber, secondaryPlotNumbers, unifiedPlotNumber);
      return NextResponse.json(result);
    }

    if (action === 'update') {
      const { plot } = body;
      const updated = await updatePlotRecord(plot);
      return NextResponse.json({ success: true, plot: updated });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Error processing plot action';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
