import React, { useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { WorkoutLog, LoggedExercise } from '../utils/types';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { KeyboardAwareFlatList, KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTranslation } from 'react-i18next';
import { WeightLogStackParamList } from '../App';

type LogWeightsRouteProp = RouteProp<WeightLogStackParamList, 'LogWeights'>;

export default function LogWeights() {
  const db = useSQLiteContext();
  
  const navigation = useNavigation();
  const route = useRoute<LogWeightsRouteProp>();

  const { theme } = useTheme(); // Add the theme hook here
  const { t } = useTranslation(); // Initialize translations
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutLog | null>(null);
  const [exercises, setExercises] = useState<LoggedExercise[]>([]);
  const [weights, setWeights] = useState<{ [key: string]: string }>({});
  const [reps, setReps] = useState<{ [key: string]: string }>({});
  const [exerciseSets, setExerciseSets] = useState<{ [key: string]: number[] }>({});
  const { weightFormat, dateFormat } = useSettings();

  const muscleGroupData = [
    { label: t('Unspecified'), value: null },
    { label: t('Chest'), value: 'chest' },
    { label: t('Back'), value: 'back' },
    { label: t('Shoulders'), value: 'shoulders' },
    { label: t('Biceps'), value: 'biceps' },
    { label: t('Triceps'), value: 'triceps' },
    { label: t('Forearms'), value: 'forearms' },
    { label: t('Abs'), value: 'abs' },
    { label: t('Legs'), value: 'legs' },
    { label: t('Glutes'), value: 'glutes' },
    { label: t('Hamstrings'), value: 'hamstrings' },
    { label: t('Calves'), value: 'calves' },
    { label: t('Quads'), value: 'quads' },
  ];

  useEffect(() => {
    const passedWorkoutLogId = route.params?.workout_log_id;
    if (passedWorkoutLogId) {
      fetchAndSetWorkout(passedWorkoutLogId);
    } else {
      fetchWorkouts();
    }
  }, [route.params?.workout_log_id]);

  const fetchAndSetWorkout = async (workout_log_id: number) => {
    try {
      const workout = await db.getFirstAsync<WorkoutLog>(
        'SELECT * FROM Workout_Log WHERE workout_log_id = ?',
        [workout_log_id]
      );
      if (workout) {
        setSelectedWorkout(workout);
        fetchExercises(workout.workout_log_id);
      } else {
        Alert.alert(t('errorTitle'), t('workoutNotFound'));
        fetchWorkouts(); // Fallback to list
      }
    } catch (error) {
      console.error('Error fetching specific workout:', error);
      fetchWorkouts(); // Fallback to list
    }
  };

  const fetchWorkouts = async () => {
    try {
      const result = await db.getAllAsync<WorkoutLog>(
        `SELECT * FROM Workout_Log 
         WHERE workout_log_id NOT IN (
           SELECT DISTINCT workout_log_id FROM Weight_Log
         )
         ORDER BY workout_date DESC;`
      );

      const today = new Date().getTime();
      const filteredWorkouts = result.filter(
        (workout) => workout.workout_date * 1000 <= today
      );

      setWorkouts(filteredWorkouts);
    } catch (error) {
      console.error('Error fetching workouts:', error);
    }
  };

  const fetchExercises = async (workout_log_id: number) => {
    try {
      const result = await db.getAllAsync<LoggedExercise>(
        'SELECT * FROM Logged_Exercises WHERE workout_log_id = ?;',
        [workout_log_id]
      );
      setExercises(result);

      const initialWeights: { [key: string]: string } = {};
      const initialReps: { [key: string]: string } = {};
      const initialSets: { [key: string]: number[] } = {};

      result.forEach((exercise) => {
        const sets = Array.from({ length: exercise.sets }, (_, i) => i + 1); // Default set numbers
        initialSets[exercise.logged_exercise_id] = sets;

        sets.forEach((setNumber) => {
          const key = `${exercise.logged_exercise_id}_${setNumber}`;
          initialWeights[key] = ''; // Empty default for user input
          initialReps[key] = exercise.reps.toString(); // Default reps as string
        });
      });

      setWeights(initialWeights);
      setReps(initialReps);
      setExerciseSets(initialSets); // Preload default sets
    } catch (error) {
      console.error('Error fetching exercises:', error);
    }
  };
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp * 1000); // Convert timestamp to Date object
    const today = new Date();
    const yesterday = new Date();
    const tomorrow = new Date();
  
    yesterday.setDate(today.getDate() - 1); // Yesterday's date
    tomorrow.setDate(today.getDate() + 1); // Tomorrow's date
  
    // Helper to compare dates without time
    const isSameDay = (d1: Date, d2: Date) =>
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear();
  
    // Check if the date matches today, yesterday, or tomorrow
    if (isSameDay(date, today)) {
      return t('Today');
    } else if (isSameDay(date, yesterday)) {
      return t('Yesterday');
    } else if (isSameDay(date, tomorrow)) {
      return t('Tomorrow');
    }
  
    // Default date formatting based on user-selected format
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
  
    return dateFormat === 'mm-dd-yyyy'
      ? `${month}-${day}-${year}`
      : `${day}-${month}-${year}`;
  };
  

  
  const addSet = (exerciseId: string) => {
    setExerciseSets((prev) => {
      const currentSets = prev[exerciseId] || [];
      const newSetNumber = currentSets.length > 0 ? Math.max(...currentSets) + 1 : 1; // Add next set number
      return {
        ...prev,
        [exerciseId]: [...currentSets, newSetNumber],
      };
    });
  };

  const deleteSet = (exerciseId: string, setNumber: number) => {
    setExerciseSets((prev) => ({
      ...prev,
      [exerciseId]: prev[exerciseId].filter((set) => set !== setNumber),
    }));

    const key = `${exerciseId}_${setNumber}`;
    setWeights((prev) => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
    setReps((prev) => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  const logWeights = async () => {
    if (!selectedWorkout) {
      Alert.alert(t('errorTitle'), t('selectAWorkout'));
      return;
    }

    for (const exercise of exercises) {
      for (const setNumber of exerciseSets[exercise.logged_exercise_id]) {
        const weightKey = `${exercise.logged_exercise_id}_${setNumber}`;
        const repsKey = `${exercise.logged_exercise_id}_${setNumber}`;

        const weight = parseFloat(weights[weightKey]?.replace(',', '.') || '0');
        const repsCount = parseInt(reps[repsKey] || '0', 10);

        if (weight <= 0 || repsCount <= 0) {
          Alert.alert(
            t('errorTitle'),
            t('logWeightsError')
          );
          return;
        }
      }
    }

    try {
      await db.withTransactionAsync(async () => {
        for (const exercise of exercises) {
          for (const setNumber of exerciseSets[exercise.logged_exercise_id]) {
            const weightKey = `${exercise.logged_exercise_id}_${setNumber}`;
            const repsKey = `${exercise.logged_exercise_id}_${setNumber}`;

            const weight = parseFloat(weights[weightKey]?.replace(',', '.') || '0');
            const repsCount = parseInt(reps[repsKey] || '0', 10);

            await db.runAsync(
              `INSERT INTO Weight_Log 
               (workout_log_id, logged_exercise_id, exercise_name, set_number, weight_logged, reps_logged, muscle_group)
               VALUES (?, ?, ?, ?, ?, ?, ?);`,
              [
                selectedWorkout.workout_log_id,
                exercise.logged_exercise_id,
                exercise.exercise_name,
                setNumber,
                weight,
                repsCount,
                exercise.muscle_group || null,
              ]
            );
          }
        }
      });

      navigation.goBack();
    } catch (error) {
      console.error('Error logging weights:', error);
      Alert.alert(t('errorTitle'), t('failedToLogWeights'));
    }
  };
  const [adHeight, setAdHeight] = useState(50);

  const handleWeightChange = React.useCallback((key: string, value: string) => {
    setWeights(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleRepsChange = React.useCallback((key: string, value: string) => {
    setReps(prev => ({ ...prev, [key]: value }));
  }, []);

  const renderExercise = (exercise: LoggedExercise) => {
    const muscleGroupInfo = muscleGroupData.find(mg => mg.value === exercise.muscle_group);
    return (
      <View style={[styles.exerciseContainer, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
          <Text style={[styles.exerciseTitle, { color: theme.text }]}>{exercise.exercise_name}</Text>
          {muscleGroupInfo && muscleGroupInfo.value && (
            <View style={[styles.muscleGroupBadge, { backgroundColor: theme.card, borderColor: theme.border, marginLeft: 8 }]}>
              <Text style={[styles.muscleGroupBadgeText, { color: theme.text }]}>
                {muscleGroupInfo.label}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.labelsRow}>
          <Text style={[styles.label, { color: theme.text }]}>{t('repsPlaceholder')}</Text>
          <Text style={[styles.label, { color: theme.text }]}>{t('Weight')} ({weightFormat})</Text>
        </View>
        {exerciseSets[exercise.logged_exercise_id]?.map((setNumber) => {
          const weightKey = `${exercise.logged_exercise_id}_${setNumber}`;
          const repsKey = `${exercise.logged_exercise_id}_${setNumber}`;
    
          return (
            <SetInputRow
              key={`${exercise.logged_exercise_id}_${setNumber}`}
              setNumber={setNumber}
              reps={reps[repsKey]}
              weight={weights[weightKey]}
              onRepsChange={(text: string) => handleRepsChange(repsKey, text)}
              onWeightChange={(text: string) => handleWeightChange(weightKey, text)}
              onDelete={() => deleteSet(exercise.logged_exercise_id.toString(), setNumber)}
            />
          );
        })}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => addSet(exercise.logged_exercise_id.toString())}>
            <Ionicons name="add" size={28} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  

  return (

<KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ flexGrow: 1, padding: 20 }}
      enableOnAndroid={true}
    >

  
<TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
    <Ionicons name="arrow-back" size={24} color={theme.text} />
  </TouchableOpacity>

  <Text style={[styles.title, { color: theme.text }]}>{t('trackWeights')}</Text>
      

  {!selectedWorkout ? (
    <KeyboardAwareFlatList
      scrollEnabled={false}
      data={workouts}
      keyExtractor={(item) => item.workout_log_id.toString()}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.workoutContainer, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => {
            setSelectedWorkout(item);
            fetchExercises(item.workout_log_id);
          }}
        >
          <Text style={[styles.workoutName, { color: theme.text }]}>{item.workout_name}</Text>
          <Text style={[styles.dayName, { color: theme.text }]}>{item.day_name}</Text>
          <Text style={[styles.workoutDate, { color: theme.text }]}>{formatDate(item.workout_date)} </Text>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <Text style={[styles.emptyText, { color: theme.text }]}>{t('noWorkoutScheduled')}</Text>
      }
    />
  ) : (
    <>
      <KeyboardAwareFlatList
        scrollEnabled={false}
        data={exercises}
        keyExtractor={(item) => item.logged_exercise_id.toString()}
        renderItem={({ item }) => renderExercise(item)}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.text }]}>{t('noExercises')}</Text>
        }
      />
      <Text style={[styles.tipText, { color: theme.text, marginBottom: 10 }]}>{t('logWeightsTipText')}</Text>
      <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.buttonBackground }]} onPress={logWeights}>
        <Text style={[styles.saveButtonText, { color: theme.buttonText }]}>{t('trackWeights')}</Text>
      </TouchableOpacity>
    </>
  )}
    </KeyboardAwareScrollView>

  );
}

type SetInputRowProps = {
  setNumber: number;
  reps: string;
  weight: string;
  onRepsChange: (text: string) => void;
  onWeightChange: (text: string) => void;
  onDelete: () => void;
};

const SetInputRow = React.memo(({ setNumber, reps, weight, onRepsChange, onWeightChange, onDelete }: SetInputRowProps) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { weightFormat } = useSettings();

  return (
    <TouchableOpacity
      onLongPress={onDelete}
      style={[styles.setContainer, { backgroundColor: 'transparent' }]}
    >
      <Text style={[styles.setText, { color: theme.text }]}>{t('Set')} {setNumber}:</Text>
      <TextInput
        style={[styles.input, { color: theme.text, backgroundColor: 'transparent' }]}
        placeholder={t('repsPlaceholder') + " (> 0)"}
        placeholderTextColor={theme.logborder}
        keyboardType="numeric"
        value={reps}
        onChangeText={onRepsChange}
      />

      <TextInput
        style={[styles.input, { color: theme.text, backgroundColor: 'transparent' }]}
        placeholder={weightFormat + " (> 0)"}
        placeholderTextColor={theme.logborder}
        keyboardType="decimal-pad"
        value={weight}
        onChangeText={onWeightChange}
      />
    </TouchableOpacity>
  );
});

// LogWeights.tsx

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  adContainer: {
  alignItems : 'center',
  },
  backButton: {

    top: 40,
    left: 10,
    zIndex: 10,
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#000000',
  },
  workoutContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  workoutName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
  },
  workoutDate: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
    textAlign: 'center',
    marginBottom: 5,
  },
  exerciseContainer: {
    marginBottom: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginVertical: 50,
  },
  addSetButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  exerciseTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 70,
    marginBottom: 5,
    paddingHorizontal: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    flex: 1,
  },
  setContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  setText: {
    fontSize: 18,
    textAlign: 'center',
    flex: 1,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    borderRadius: 5,
    padding: 8,
    marginHorizontal: 25,
    textAlign: 'center',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#000000',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 5,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyText: {
    marginTop:80,
    textAlign: 'center',
    color: '#666666',
    fontSize: 16,
  },
  tipText: {
    textAlign: 'center',
    fontSize: 12,
    fontStyle: 'italic',
  },
  muscleGroupBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: 1,
    alignSelf: 'center',
  },
  muscleGroupBadgeText: {
      fontSize: 12,
      fontWeight: '600',
  },
});
