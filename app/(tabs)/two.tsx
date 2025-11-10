import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';

export default function PlaceholderScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>준비 중</Text>
      <Text style={styles.body}>이 탭은 나중에 드럼 악보 편집 기능으로 교체할 예정입니다.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  body: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
});
