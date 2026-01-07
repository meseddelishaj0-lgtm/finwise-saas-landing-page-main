// app/premium/portfolio-optimizer.tsx
// Diamond Feature - AI Portfolio Optimization
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { usePremiumFeature, FEATURE_TIERS } from '@/hooks/usePremiumFeature';

const FMP_API_KEY = process.env.EXPO_PUBLIC_FMP_API_KEY || '';

interface PortfolioHolding {
  symbol: string;
  shares: number;
  avgPrice: number;
  currentPrice?: number;
  value?: number;
  weight?: number;
  gain?: number;
  gainPercent?: number;
}

interface OptimizationResult {
  currentAllocation: {
    stocks: number;
    sectors: Record<string, number>;
  };
  recommendations: {
    action: 'buy' | 'sell' | 'hold';
    symbol: string;
    reason: string;
    targetWeight: number;
    currentWeight: number;
  }[];
  riskAnalysis: {
    diversificationScore: number;
    volatilityRisk: string;
    concentrationRisk: string;
    sectorExposure: string;
  };
  suggestions: string[];
  targetAllocation: Record<string, number>;
}

export default function PortfolioOptimizerScreen() {
  const { canAccess } = usePremiumFeature();
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [newSymbol, setNewSymbol] = useState('');
  const [newShares, setNewShares] = useState('');
  const [newAvgPrice, setNewAvgPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null);
  const [totalValue, setTotalValue] = useState(0);

  // Redirect to paywall if user doesn't have access
  useEffect(() => {
    if (!canAccess(FEATURE_TIERS.PORTFOLIO_OPTIMIZATION)) {
      router.replace('/(modals)/paywall');
    }
  }, [canAccess]);

  // Update prices and calculations
  useEffect(() => {
    if (holdings.length > 0) {
      updatePrices();
    }
  }, [holdings.length]);

  const updatePrices = async () => {
    if (holdings.length === 0) return;

    setLoading(true);
    const symbols = holdings.map(h => h.symbol).join(',');

    try {
      const response = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${symbols}?apikey=${FMP_API_KEY}`
      );
      const data = await response.json();

      if (Array.isArray(data)) {
        const priceMap: Record<string, number> = {};
        data.forEach((quote: any) => {
          priceMap[quote.symbol] = quote.price;
        });

        let total = 0;
        const updatedHoldings = holdings.map(holding => {
          const currentPrice = priceMap[holding.symbol] || holding.avgPrice;
          const value = currentPrice * holding.shares;
          total += value;
          const gain = value - (holding.avgPrice * holding.shares);
          const gainPercent = ((currentPrice - holding.avgPrice) / holding.avgPrice) * 100;

          return {
            ...holding,
            currentPrice,
            value,
            gain,
            gainPercent,
          };
        });

        // Calculate weights
        const withWeights = updatedHoldings.map(h => ({
          ...h,
          weight: (h.value! / total) * 100,
        }));

        setHoldings(withWeights);
        setTotalValue(total);
      }
    } catch (err) {
      
    } finally {
      setLoading(false);
    }
  };

  const addHolding = async () => {
    if (!newSymbol.trim() || !newShares.trim() || !newAvgPrice.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const shares = parseFloat(newShares);
    const avgPrice = parseFloat(newAvgPrice);

    if (isNaN(shares) || isNaN(avgPrice) || shares <= 0 || avgPrice <= 0) {
      Alert.alert('Error', 'Please enter valid numbers');
      return;
    }

    // Verify symbol exists
    try {
      const response = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${newSymbol.toUpperCase()}?apikey=${FMP_API_KEY}`
      );
      const data = await response.json();

      if (!data || !Array.isArray(data) || data.length === 0) {
        Alert.alert('Error', `Symbol ${newSymbol.toUpperCase()} not found`);
        return;
      }

      const newHolding: PortfolioHolding = {
        symbol: newSymbol.toUpperCase(),
        shares,
        avgPrice,
        currentPrice: data[0].price,
      };

      setHoldings([...holdings, newHolding]);
      setNewSymbol('');
      setNewShares('');
      setNewAvgPrice('');
    } catch (err) {
      Alert.alert('Error', 'Failed to add holding');
    }
  };

  const removeHolding = (symbol: string) => {
    setHoldings(holdings.filter(h => h.symbol !== symbol));
    setOptimization(null);
  };

  const optimizePortfolio = async () => {
    if (holdings.length < 2) {
      Alert.alert('Error', 'Add at least 2 holdings to optimize');
      return;
    }

    setOptimizing(true);
    setOptimization(null);

    try {
      // Fetch sector data for each holding
      const profiles = await Promise.all(
        holdings.map(h =>
          fetch(`https://financialmodelingprep.com/api/v3/profile/${h.symbol}?apikey=${FMP_API_KEY}`)
            .then(r => r.json())
        )
      );

      const sectorMap: Record<string, string> = {};
      profiles.forEach((p, i) => {
        sectorMap[holdings[i].symbol] = p[0]?.sector || 'Unknown';
      });

      // Calculate sector allocation
      const sectorAllocation: Record<string, number> = {};
      holdings.forEach(h => {
        const sector = sectorMap[h.symbol];
        sectorAllocation[sector] = (sectorAllocation[sector] || 0) + (h.weight || 0);
      });

      // AI optimization
      const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [
            {
              role: 'user',
              content: `Analyze and optimize this investment portfolio:

CURRENT HOLDINGS:
${holdings.map(h => `- ${h.symbol}: ${h.shares} shares @ $${h.avgPrice?.toFixed(2)} avg, current $${h.currentPrice?.toFixed(2)}, weight ${h.weight?.toFixed(1)}%, gain ${h.gainPercent?.toFixed(1)}%`).join('\n')}

SECTOR ALLOCATION:
${Object.entries(sectorAllocation).map(([s, w]) => `- ${s}: ${w.toFixed(1)}%`).join('\n')}

TOTAL VALUE: $${totalValue.toFixed(2)}

Provide portfolio optimization recommendations in this exact JSON format:
{
  "recommendations": [
    {"action": "buy|sell|hold", "symbol": "SYMBOL", "reason": "brief reason", "targetWeight": 15, "currentWeight": 10}
  ],
  "riskAnalysis": {
    "diversificationScore": 75,
    "volatilityRisk": "Medium - explanation",
    "concentrationRisk": "High/Medium/Low - explanation",
    "sectorExposure": "explanation of sector imbalances"
  },
  "suggestions": [
    "Add defensive stocks for balance",
    "Consider reducing tech exposure"
  ],
  "targetAllocation": {
    "Technology": 25,
    "Healthcare": 15,
    "Financials": 15
  }
}

Provide actionable advice for a balanced, risk-adjusted portfolio. Return ONLY valid JSON.`
            }
          ],
        })
      });

      const aiData = await aiResponse.json();
      const aiText = aiData.content?.[0]?.text || '';

      let parsedOptimization;
      try {
        parsedOptimization = JSON.parse(aiText);
      } catch {
        parsedOptimization = {
          recommendations: [],
          riskAnalysis: {
            diversificationScore: 50,
            volatilityRisk: 'Unable to analyze',
            concentrationRisk: 'Unable to analyze',
            sectorExposure: 'Unable to analyze',
          },
          suggestions: ['Add more holdings for better analysis'],
          targetAllocation: {},
        };
      }

      setOptimization({
        currentAllocation: {
          stocks: holdings.length,
          sectors: sectorAllocation,
        },
        ...parsedOptimization,
      });

    } catch (err) {
      
      Alert.alert('Error', 'Failed to optimize portfolio');
    } finally {
      setOptimizing(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'buy': return '#34C759';
      case 'sell': return '#FF3B30';
      default: return '#FF9500';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.diamondBadge}>
            <Ionicons name="diamond" size={14} color="#000" />
            <Text style={styles.diamondBadgeText}>Diamond</Text>
          </View>
          <Text style={styles.headerTitle}>Portfolio Optimizer</Text>
        </View>
        <TouchableOpacity onPress={updatePrices} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Add Holding */}
        <View style={styles.addCard}>
          <Text style={styles.cardTitle}>Add Holding</Text>
          <View style={styles.inputRow}>
            <View style={[styles.inputContainer, { flex: 2 }]}>
              <TextInput
                style={styles.input}
                placeholder="Symbol"
                placeholderTextColor="#8E8E93"
                value={newSymbol}
                onChangeText={setNewSymbol}
                autoCapitalize="characters"
              />
            </View>
            <View style={[styles.inputContainer, { flex: 1 }]}>
              <TextInput
                style={styles.input}
                placeholder="Shares"
                placeholderTextColor="#8E8E93"
                value={newShares}
                onChangeText={setNewShares}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={[styles.inputContainer, { flex: 1 }]}>
              <TextInput
                style={styles.input}
                placeholder="Avg $"
                placeholderTextColor="#8E8E93"
                value={newAvgPrice}
                onChangeText={setNewAvgPrice}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={addHolding}>
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Portfolio Summary */}
        {holdings.length > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.cardTitle}>Portfolio Summary</Text>
              {loading && <ActivityIndicator size="small" color="#007AFF" />}
            </View>
            <View style={styles.summaryStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
                <Text style={styles.statLabel}>Total Value</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{holdings.length}</Text>
                <Text style={styles.statLabel}>Holdings</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[
                  styles.statValue,
                  { color: holdings.reduce((sum, h) => sum + (h.gain || 0), 0) >= 0 ? '#34C759' : '#FF3B30' }
                ]}>
                  {holdings.reduce((sum, h) => sum + (h.gain || 0), 0) >= 0 ? '+' : ''}
                  ${Math.abs(holdings.reduce((sum, h) => sum + (h.gain || 0), 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </Text>
                <Text style={styles.statLabel}>Total Gain</Text>
              </View>
            </View>
          </View>
        )}

        {/* Holdings List */}
        {holdings.length > 0 && (
          <View style={styles.holdingsCard}>
            <Text style={styles.cardTitle}>Holdings</Text>
            {holdings.map((holding) => (
              <View key={holding.symbol} style={styles.holdingItem}>
                <View style={styles.holdingMain}>
                  <View>
                    <Text style={styles.holdingSymbol}>{holding.symbol}</Text>
                    <Text style={styles.holdingShares}>{holding.shares} shares</Text>
                  </View>
                  <View style={styles.holdingValues}>
                    <Text style={styles.holdingValue}>${holding.value?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
                    <Text style={[
                      styles.holdingGain,
                      { color: (holding.gainPercent || 0) >= 0 ? '#34C759' : '#FF3B30' }
                    ]}>
                      {(holding.gainPercent || 0) >= 0 ? '+' : ''}{holding.gainPercent?.toFixed(1)}%
                    </Text>
                  </View>
                </View>
                <View style={styles.holdingFooter}>
                  <View style={styles.weightBar}>
                    <View style={[styles.weightFill, { width: `${holding.weight || 0}%` }]} />
                  </View>
                  <Text style={styles.weightText}>{holding.weight?.toFixed(1)}%</Text>
                  <TouchableOpacity onPress={() => removeHolding(holding.symbol)} style={styles.removeButton}>
                    <Ionicons name="close" size={16} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Optimize Button */}
        {holdings.length >= 2 && (
          <TouchableOpacity
            style={[styles.optimizeButton, optimizing && styles.buttonDisabled]}
            onPress={optimizePortfolio}
            disabled={optimizing}
          >
            {optimizing ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color="#000" />
                <Text style={styles.optimizeButtonText}>Optimize Portfolio</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Optimization Results */}
        {optimization && (
          <View style={styles.optimizationContainer}>
            {/* Risk Analysis */}
            <View style={styles.riskCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="shield-checkmark" size={20} color="#007AFF" />
                <Text style={styles.cardTitle}>Risk Analysis</Text>
              </View>
              <View style={styles.scoreContainer}>
                <View style={styles.scoreCircle}>
                  <Text style={styles.scoreValue}>{optimization.riskAnalysis.diversificationScore}</Text>
                  <Text style={styles.scoreLabel}>Score</Text>
                </View>
                <View style={styles.scoreInfo}>
                  <Text style={styles.scoreTitle}>Diversification Score</Text>
                  <Text style={styles.scoreDescription}>
                    {optimization.riskAnalysis.diversificationScore >= 70 ? 'Well diversified' :
                     optimization.riskAnalysis.diversificationScore >= 50 ? 'Moderately diversified' :
                     'Needs more diversification'}
                  </Text>
                </View>
              </View>
              <View style={styles.riskItems}>
                <View style={styles.riskItem}>
                  <Text style={styles.riskLabel}>Volatility Risk</Text>
                  <Text style={styles.riskValue}>{optimization.riskAnalysis.volatilityRisk}</Text>
                </View>
                <View style={styles.riskItem}>
                  <Text style={styles.riskLabel}>Concentration Risk</Text>
                  <Text style={styles.riskValue}>{optimization.riskAnalysis.concentrationRisk}</Text>
                </View>
                <View style={styles.riskItem}>
                  <Text style={styles.riskLabel}>Sector Exposure</Text>
                  <Text style={styles.riskValue}>{optimization.riskAnalysis.sectorExposure}</Text>
                </View>
              </View>
            </View>

            {/* Recommendations */}
            {optimization.recommendations.length > 0 && (
              <View style={styles.recommendationsCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="bulb" size={20} color="#FFD700" />
                  <Text style={styles.cardTitle}>Recommendations</Text>
                </View>
                {optimization.recommendations.map((rec, index) => (
                  <View key={index} style={styles.recItem}>
                    <View style={[styles.actionBadge, { backgroundColor: getActionColor(rec.action) + '20' }]}>
                      <Text style={[styles.actionText, { color: getActionColor(rec.action) }]}>
                        {rec.action.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.recContent}>
                      <Text style={styles.recSymbol}>{rec.symbol}</Text>
                      <Text style={styles.recReason}>{rec.reason}</Text>
                      <View style={styles.weightChange}>
                        <Text style={styles.weightChangeText}>
                          {rec.currentWeight.toFixed(1)}% → {rec.targetWeight.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Suggestions */}
            {optimization.suggestions.length > 0 && (
              <View style={styles.suggestionsCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                  <Text style={styles.cardTitle}>Action Items</Text>
                </View>
                {optimization.suggestions.map((suggestion, index) => (
                  <View key={index} style={styles.suggestionItem}>
                    <Ionicons name="chevron-forward" size={16} color="#34C759" />
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Target Allocation */}
            {Object.keys(optimization.targetAllocation).length > 0 && (
              <View style={styles.allocationCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="pie-chart" size={20} color="#AF52DE" />
                  <Text style={styles.cardTitle}>Target Sector Allocation</Text>
                </View>
                <View style={styles.allocationItems}>
                  {Object.entries(optimization.targetAllocation).map(([sector, weight]) => (
                    <View key={sector} style={styles.allocationItem}>
                      <Text style={styles.allocationSector}>{sector}</Text>
                      <View style={styles.allocationBar}>
                        <View style={[styles.allocationFill, { width: `${weight}%` }]} />
                      </View>
                      <Text style={styles.allocationWeight}>{weight}%</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Empty State */}
        {holdings.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="pie-chart-outline" size={48} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>Build Your Portfolio</Text>
            <Text style={styles.emptyText}>
              Add your holdings above to get AI-powered optimization recommendations.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    alignItems: 'center',
  },
  diamondBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B9F2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginBottom: 4,
  },
  diamondBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  refreshButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  addCard: {
    backgroundColor: '#FFF',
    margin: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  inputContainer: {
    backgroundColor: '#F5F5F7',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  input: {
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  summaryCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  holdingsCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
  },
  holdingItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingVertical: 12,
  },
  holdingMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  holdingSymbol: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },
  holdingShares: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  holdingValues: {
    alignItems: 'flex-end',
  },
  holdingValue: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  holdingGain: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  holdingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  weightBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E5EA',
    borderRadius: 3,
    overflow: 'hidden',
  },
  weightFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  weightText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    width: 40,
    textAlign: 'right',
  },
  removeButton: {
    padding: 4,
  },
  optimizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B9F2FF',
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  optimizeButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },
  optimizationContainer: {
    paddingHorizontal: 16,
  },
  riskCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#007AFF',
  },
  scoreLabel: {
    fontSize: 11,
    color: '#8E8E93',
  },
  scoreInfo: {
    flex: 1,
  },
  scoreTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
  scoreDescription: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
  },
  riskItems: {
    gap: 12,
  },
  riskItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 12,
  },
  riskLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  riskValue: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  recommendationsCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  recItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  actionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  recContent: {
    flex: 1,
  },
  recSymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  recReason: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    lineHeight: 20,
  },
  weightChange: {
    marginTop: 6,
  },
  weightChangeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  suggestionsCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  allocationCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  allocationItems: {
    gap: 12,
  },
  allocationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  allocationSector: {
    width: 100,
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  allocationBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    overflow: 'hidden',
  },
  allocationFill: {
    height: '100%',
    backgroundColor: '#AF52DE',
    borderRadius: 4,
  },
  allocationWeight: {
    width: 40,
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
  },
});
