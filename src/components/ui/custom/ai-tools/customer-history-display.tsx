import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Phone, Mail, User } from 'lucide-react';

interface CustomerHistoryDisplayProps {
  customer: {
    customerId: string;
    customerName: string;
    accountType: string;
  };
  interactions: Array<{
    id: string;
    date: string;
    type: string;
    summary: string;
    agent: string;
  }>;
}

export function CustomerHistoryDisplay({ customer, interactions }: CustomerHistoryDisplayProps) {
  const getInteractionIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'phone call':
        return <Phone className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Customer History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div>
            <h3 className="font-semibold">{customer.customerName}</h3>
            <p className="text-sm text-muted-foreground">ID: {customer.customerId}</p>
          </div>
          <Badge variant="secondary">{customer.accountType}</Badge>
        </div>
        
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Recent Interactions</h4>
          {interactions.map((interaction) => (
            <div key={interaction.id} className="flex items-start gap-3 p-3 border rounded-lg">
              <div className="flex-shrink-0 mt-1">
                {getInteractionIcon(interaction.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {interaction.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(interaction.date).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm font-medium">{interaction.summary}</p>
                <p className="text-xs text-muted-foreground">Agent: {interaction.agent}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}