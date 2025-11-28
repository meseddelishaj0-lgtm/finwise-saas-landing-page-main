import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { fmp } from '../config/api';

export default function ExploreScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(() => {
      searchStocks(query);
    }, 500);

    return () => clearTimeout(timeout);
  }, [query]);

  const searchStocks = async (text) => {
    setLoading(true);
    try {
      const res = await fetch(fmp.search(text));
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.log("FMP Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.item}>
      <View style={styles.row}>
        <Text style={styles.symbol}>{item.symbol}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
      </View>
      <Text style={styles.exchange}>{item.exchangeShortName || item.exchange}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Search stocks, ETFs..."
        placeholderTextColor="#888"
        value={query}
        onChangeText={setQuery}
        autoFocus={false}
      />

      {loading && <ActivityIndicator style={{ marginTop: 20 }} color="#007AFF" />}

      <FlatList
        data={results}
        keyExtractor={(item) => item.symbol}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        ListEmptyComponent={
          query.length >= 2 && !loading ? (
            <Text style={styles.empty}>No results found</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  input: {
    margin: 16,
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  item: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    elevation: 2,
  },
  row: { flex: 1 },
  symbol: { fontSize: 18, fontWeight: 'bold' },
  name: { color: '#555', marginTop: 4 },
  exchange: { color: '#888', fontSize: 12 },
  empty: { textAlign: 'center', marginTop: 50, color: '#666', fontSize: 16 },
});

