<?php
declare(strict_types=1);

namespace JdServices;

class TaxEngine
{
    public static function roundToCent(float $amount): float
    {
        return round($amount, 2);
    }

    public static function calculateLineTotals(float $unitPriceHt, float $quantity, float $taxRate, string $taxRateName = 'TVA 20%'): array
    {
        $lineHt = self::roundToCent($unitPriceHt * $quantity);
        $lineTax = self::roundToCent(($lineHt * $taxRate) / 100);
        $lineTtc = self::roundToCent($lineHt + $lineTax);

        return [
            'totalHt' => $lineHt,
            'totalTax' => $lineTax,
            'totalTtc' => $lineTtc,
            'taxRate' => $taxRate,
            'taxRateName' => $taxRateName,
        ];
    }

    /**
     * Calcule le récapitulatif financier et la ventilation de TVA d'un ensemble de lignes.
     */
    public static function calculateDocumentTotals(array $lines): array
    {
        $totalHt = 0.0;
        $totalTax = 0.0;
        $taxBreakdown = [];

        foreach ($lines as $line) {
            $unitPriceHt = (float)($line['unitPriceHt'] ?? 0);
            $quantity = (float)($line['quantity'] ?? 1);
            $taxRate = (float)($line['taxRate'] ?? 20.0);
            $taxRateName = (string)($line['taxRateName'] ?? "TVA {$taxRate}%");

            $lineCalculated = self::calculateLineTotals($unitPriceHt, $quantity, $taxRate, $taxRateName);

            $totalHt += $lineCalculated['totalHt'];
            $totalTax += $lineCalculated['totalTax'];

            $rateKey = sprintf('%.2f', $taxRate);
            if (!isset($taxBreakdown[$rateKey])) {
                $taxBreakdown[$rateKey] = [
                    'rate' => $taxRate,
                    'name' => $taxRateName,
                    'baseHt' => 0.0,
                    'taxAmount' => 0.0,
                ];
            }
            $taxBreakdown[$rateKey]['baseHt'] += $lineCalculated['totalHt'];
            $taxBreakdown[$rateKey]['taxAmount'] += $lineCalculated['totalTax'];
        }

        $totalHt = self::roundToCent($totalHt);
        $totalTax = self::roundToCent($totalTax);
        $totalTtc = self::roundToCent($totalHt + $totalTax);

        // Arrondir les montants de chaque tranche
        foreach ($taxBreakdown as &$item) {
            $item['baseHt'] = self::roundToCent($item['baseHt']);
            $item['taxAmount'] = self::roundToCent($item['taxAmount']);
        }
        unset($item);

        return [
            'totalHt' => $totalHt,
            'totalTax' => $totalTax,
            'totalTtc' => $totalTtc,
            'taxBreakdown' => array_values($taxBreakdown),
        ];
    }
}
