import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { WorkoutStackParamList } from '../App'; // Adjust path to where WorkoutStackParamList is defined
import { Workout } from '../utils/types';
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ScrollView, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext'; // Adjust the path to your ThemeContext
import { useTranslation } from 'react-i18next';
import { useSQLiteContext } from 'expo-sqlite';
import { exportWorkout, importWorkout } from '../utils/workoutSharingUtils';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';


type WorkoutListNavigationProp = StackNavigationProp<WorkoutStackParamList, 'WorkoutsList'>;

export default function WorkoutList({
  workouts,
  deleteWorkout,
  getWorkouts,
}: {
  workouts: Workout[];
  deleteWorkout: (workout_id: number, workout_name: string) => Promise<void>;
  getWorkouts: () => Promise<void>;
}) {
  const navigation = useNavigation<WorkoutListNavigationProp>();
  const { theme } = useTheme(); // Get the current theme
  const { t } = useTranslation(); // Initialize translations
  const db = useSQLiteContext();
  const sortedWorkouts = [...workouts].sort((a, b) => b.workout_id - a.workout_id);
  

  const handleExportWorkout = (workoutId: number) => {
    exportWorkout(db, workoutId);
  };

  const handleImportWorkout = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
      });

      if (result.assets && result.assets[0]) {
        const fileUri = result.assets[0].uri;
        const jsonString = await FileSystem.readAsStringAsync(fileUri);
        const success = await importWorkout(db, jsonString);
        if (success) {
          getWorkouts(); // Refresh the list
        }
      }
    } catch (error) {
      console.error('Error importing workout:', error);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Title */}
      <View style={styles.titleContainer}>
        <Ionicons name="barbell" size={30} color={theme.text} style={styles.titleIcon} />
        <Text style={[styles.title, { color: theme.text }]}>{t('MyWorkouts')}</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        {/* Create New Workout Button */}
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: theme.buttonBackground }]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('CreateWorkout')}
        >
          <Text style={[styles.createButtonText, { color: theme.buttonText }]}>{t('CreateAWorkoutButton')}</Text>
        </TouchableOpacity>

        {/* Import Workout Button */}
        <TouchableOpacity
          style={[styles.importButton, { backgroundColor: theme.buttonBackground }]}
          activeOpacity={0.7}
          onPress={handleImportWorkout}
        >
          <Ionicons name="download-outline" size={25} color={theme.buttonText} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
          style={[
            styles.workoutCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,

            },
          ]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Difficulty')}
        >
          <Text style={[styles.workoutText, { color: theme.text }]}>{t('navigateToDifficulty')}</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.text} />
        </TouchableOpacity>

      {/* Workout List */}
      {sortedWorkouts.map((workout) => (
        <TouchableOpacity
          key={workout.workout_id}
          style={[
            styles.workoutCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
          activeOpacity={0.7}
          onLongPress={() => deleteWorkout(workout.workout_id, workout.workout_name)}
          onPress={() => navigation.navigate('WorkoutDetails', { workout_id: workout.workout_id })}
        >
          <View style={styles.workoutNameWrapper}>
            <Text style={[styles.workoutText, { color: theme.text }]}>{workout.workout_name}</Text>
            <TouchableOpacity onPress={() => handleExportWorkout(workout.workout_id)}>
              <Ionicons name="share-outline" size={24} color={theme.text} style={styles.shareIcon} />
            </TouchableOpacity>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.text} />
        </TouchableOpacity>
        
      ))}
         {/* Tip Text at the Bottom */}
    <Text style={[styles.tipText, { color: theme.text }]}>
    {t('WorkoutListTip')}
    </Text>
    </ScrollView>
  );
}

//WorkoutList.tsx

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 50, // Move everything down
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  titleIcon: {
    marginRight: 10,
  },
  title: {
    fontSize: 35, // Larger font size
    fontWeight: '900', // Extra bold
    textAlign: 'center', // Centered text
  },
  tipText: {
    marginTop: 20, // Space above the text
    textAlign: 'center', // Center align
    fontSize: 14, // Smaller font size
    fontStyle: 'italic', // Italic for emphasis
  },
  createButton: {
    borderRadius: 50,
    paddingVertical: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1, // Take up available space
    marginRight: 10, // Add space to the right
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 2,
  },
  importButton: {
    borderRadius: 50,
    paddingTop: 15,
    paddingBottom: 15,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 2,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },

  workoutCard: {
    backgroundColor: '#F7F7F7',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  workoutText: {
    fontSize: 20, // Slightly larger
    fontWeight: '700', // More bold
  },
  workoutNameWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shareIcon: {
    marginLeft: 10,
  }
});
