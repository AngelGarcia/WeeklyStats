"use client";

import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/app/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, PlusCircle, AlertCircle, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SurveyCriterion } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const { surveyCriteria: initialCriteria, updateCriteria, saveStatus } = useAppContext();
  const [criteria, setCriteria] = useState<Array<Partial<SurveyCriterion> & { tempId?: string }>>([]);
  const { toast } = useToast();

  useEffect(() => {
    setCriteria(initialCriteria);
  }, [initialCriteria]);

  const totalWeight = useMemo(() => {
    return criteria.reduce((sum, c) => sum + (c.weight || 0), 0);
  }, [criteria]);

  const handleAddCriterion = () => {
    setCriteria([...criteria, { name: '', weight: 0, tempId: crypto.randomUUID() }]);
  };

  const handleRemoveCriterion = (id: string | undefined, tempId: string | undefined) => {
    if (id) {
        setCriteria(criteria.filter(c => c.id !== id));
    } else if (tempId) {
        setCriteria(criteria.filter(c => c.tempId !== tempId));
    }
  };

  const handleCriterionChange = (index: number, field: 'name' | 'weight', value: string | number) => {
    const newCriteria = [...criteria];
    const criterion = newCriteria[index];

    if (field === 'weight') {
        const numValue = Number(value);
        if (numValue >= 0 && numValue <= 100) {
            criterion.weight = numValue;
        }
    } else {
        criterion.name = String(value);
    }
    
    setCriteria(newCriteria);
  };

  const handleSaveChanges = async () => {
    if (totalWeight !== 100) {
      toast({
        variant: "destructive",
        title: "Error de validación",
        description: `La suma de los pesos debe ser 100%, pero actualmente es ${totalWeight}%.`,
      });
      return;
    }
    if(criteria.some(c => !c.name || c.weight === 0)) {
        toast({
            variant: "destructive",
            title: "Error de validación",
            description: "Todos los criterios deben tener un nombre y un peso mayor a 0.",
        });
        return;
    }

    try {
      await updateCriteria(criteria as SurveyCriterion[]);
      toast({
        title: "Éxito",
        description: "Los criterios de la encuesta han sido actualizados.",
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: "No se pudieron guardar los cambios. Inténtalo de nuevo.",
      });
    }
  };

  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Configuración</CardTitle>
          <CardDescription>
            Gestiona los criterios para el cuestionario de eficiencia de la reunión.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label className="text-lg font-medium">Criterios de la Encuesta</Label>
            {criteria.map((criterion, index) => (
              <div key={criterion.id || criterion.tempId} className="flex items-center gap-2 p-2 border rounded-md">
                <div className="grid grid-cols-12 gap-2 flex-1">
                    <div className="col-span-8">
                        <Label htmlFor={`name-${index}`} className="sr-only">Nombre del criterio</Label>
                        <Input
                            id={`name-${index}`}
                            value={criterion.name}
                            onChange={e => handleCriterionChange(index, 'name', e.target.value)}
                            placeholder="Nombre del criterio"
                        />
                    </div>
                     <div className="col-span-3">
                        <Label htmlFor={`weight-${index}`} className="sr-only">Peso (%)</Label>
                        <Input
                            id={`weight-${index}`}
                            type="number"
                            value={criterion.weight}
                            onChange={e => handleCriterionChange(index, 'weight', e.target.value)}
                            placeholder="Peso %"
                        />
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleRemoveCriterion(criterion.id, criterion.tempId)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={handleAddCriterion}>
              <PlusCircle className="mr-2 h-4 w-4" /> Añadir Criterio
            </Button>
          </div>
          {totalWeight !== 100 && (
            <div className="flex items-center gap-2 text-sm text-destructive p-2 rounded-md bg-destructive/10">
                <AlertCircle className="h-4 w-4" />
                <span>La suma de los pesos es {totalWeight}%. Debe ser exactamente 100%.</span>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-between items-center">
            <div>
                <span className="text-lg font-bold">Total: {totalWeight}%</span>
            </div>
            <Button onClick={handleSaveChanges} disabled={saveStatus === 'saving' || totalWeight !== 100}>
                {saveStatus === 'saving' ? <Loader2 className="mr-2 animate-spin" /> : <Check className="mr-2" />}
                Guardar Cambios
            </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
