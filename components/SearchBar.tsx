import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { Search, X } from 'lucide-react-native';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchBar({ onSearch, placeholder = 'Search songs, artists, or playlists', autoFocus = false }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = (text: string) => {
    setQuery(text);
    onSearch(text);
  };

  const clearSearch = () => {
    setQuery('');
    onSearch('');
    Keyboard.dismiss();
  };

  return (
    <View style={[styles.container, isFocused && styles.focusedContainer]}>
      <Search size={20} color="#888" style={styles.searchIcon} />
      
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={handleSearch}
        placeholder={placeholder}
        placeholderTextColor="#888"
        autoFocus={autoFocus}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        returnKeyType="search"
        onSubmitEditing={() => Keyboard.dismiss()}
      />
      
      {query.length > 0 && (
        <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
          <X size={18} color="#888" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  focusedContainer: {
    borderColor: '#1DB954',
    backgroundColor: '#222',
  },
  searchIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
});