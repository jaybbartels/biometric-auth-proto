'use client';
import React, { Suspense } from 'react';
import TrainingContent from './training-content';

export default function TrainingPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
      <TrainingContent />
    </Suspense>
  );
}
