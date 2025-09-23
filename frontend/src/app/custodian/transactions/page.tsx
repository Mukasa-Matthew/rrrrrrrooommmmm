'use client';

import React from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CustodianTransactionsPage() {
	return (
		<Layout>
			<div className="p-6">
				<Card>
					<CardHeader>
						<CardTitle>Transactions</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-gray-600">All recorded payments will appear here.</p>
					</CardContent>
				</Card>
			</div>
		</Layout>
	);
}