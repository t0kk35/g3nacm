import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SubjectDisplay as SubjectDisplayType } from '@/lib/ai-tools/tools/subject-display';

interface SubjectDisplayProps extends SubjectDisplayType {
  error?: string;
}

export function SubjectDisplay({ 
  name, 
  identifier, 
  type, 
  kycRisk, 
  address, 
  contact, 
  gridColumns = 2, 
  variableFields, 
  error 
}: SubjectDisplayProps) {
  
  const getGridClass = (columns: number) => {
    switch (columns) {
      case 1: return 'grid-cols-1';
      case 2: return 'grid-cols-2';
      case 3: return 'grid-cols-3';
      case 4: return 'grid-cols-4';
      default: return 'grid-cols-2';
    }
  };

  if (error) {
    return (
      <Card className="w-full border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            Subject Display Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <div className="flex gap-2 items-center">
            <span className="font-mono font-thin text-sm text-muted-foreground">{type}</span>
          </div>
          <div className="text-right">
            <span className="block">{name}</span>
            <span className="block text-sm text-primary font-normal">
              {identifier}
            </span>
          </div>
          {kycRisk && (
            <Badge variant={kycRisk.variant}>
              {kycRisk.level} Risk
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {(address || contact) && (
          <>
            <Separator className="my-2" />
            <div className="space-y-2 text-muted-foreground text-sm text-center">
              {address && <p>{address}</p>}
              {contact && <p>{contact}</p>}
            </div>
          </>
        )}
        
        {variableFields.length > 0 && (
          <>
            <Separator className="my-2" />
            <div className={cn("grid gap-4 text-xs", getGridClass(gridColumns))}>
              {variableFields.map((field, index) => (
                <div key={index}>
                  <p className={cn("", field.className)}>
                    <strong>{field.label}:</strong> {field.value}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}