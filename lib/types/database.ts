export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SessionStatus = "planned" | "in_progress" | "completed" | "skipped";

export type WeightUnit = "kg" | "lb";

export type Sex = "male" | "female";

export type GoalType = "lose_weight" | "gain_muscle" | "burn_fat";

export const TRAINING_LEVELS = [
  "beginner",
  "intermediate",
  "advanced",
  "professional",
] as const;
export type TrainingLevel = (typeof TRAINING_LEVELS)[number];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          unit_preference: WeightUnit;
          rest_seconds: number;
          reminders_enabled: boolean;
          weekly_goal: number;
          sex: Sex | null;
          height_cm: number | null;
          goal_type: GoalType | null;
          goal_weight_kg: number | null;
          training_level: TrainingLevel | null;
          onboarding_completed: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          unit_preference?: WeightUnit;
          rest_seconds?: number;
          reminders_enabled?: boolean;
          weekly_goal?: number;
          sex?: Sex | null;
          height_cm?: number | null;
          goal_type?: GoalType | null;
          goal_weight_kg?: number | null;
          training_level?: TrainingLevel | null;
          onboarding_completed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          unit_preference?: WeightUnit;
          rest_seconds?: number;
          reminders_enabled?: boolean;
          weekly_goal?: number;
          sex?: Sex | null;
          height_cm?: number | null;
          goal_type?: GoalType | null;
          goal_weight_kg?: number | null;
          training_level?: TrainingLevel | null;
          onboarding_completed?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      exercises: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          description: string | null;
          muscle_group: string | null;
          exercise_type: string | null;
          equipment: string | null;
          location: string | null;
          gif_url: string | null;
          primary_muscle: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          description?: string | null;
          muscle_group?: string | null;
          exercise_type?: string | null;
          equipment?: string | null;
          location?: string | null;
          gif_url?: string | null;
          primary_muscle?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          description?: string | null;
          muscle_group?: string | null;
          exercise_type?: string | null;
          equipment?: string | null;
          location?: string | null;
          gif_url?: string | null;
          primary_muscle?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exercises_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_plans: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          slug: string | null;
          is_archived: boolean;
          is_template: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          slug?: string | null;
          is_archived?: boolean;
          is_template?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          slug?: string | null;
          is_archived?: boolean;
          is_template?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_plans_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      plan_exercises: {
        Row: {
          id: string;
          plan_id: string;
          exercise_id: string | null;
          order_index: number;
          target_sets: number;
          target_reps: number;
          target_weight: number;
          rest_seconds: number | null;
        };
        Insert: {
          id?: string;
          plan_id: string;
          exercise_id?: string | null;
          order_index?: number;
          target_sets: number;
          target_reps: number;
          target_weight: number;
          rest_seconds?: number | null;
        };
        Update: {
          id?: string;
          plan_id?: string;
          exercise_id?: string | null;
          order_index?: number;
          target_sets?: number;
          target_reps?: number;
          target_weight?: number;
          rest_seconds?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "plan_exercises_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "workout_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "plan_exercises_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_sessions: {
        Row: {
          id: string;
          plan_id: string | null;
          user_id: string;
          status: SessionStatus;
          scheduled_date: string;
          completed_at: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          plan_id?: string | null;
          user_id: string;
          status?: SessionStatus;
          scheduled_date: string;
          completed_at?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          plan_id?: string | null;
          user_id?: string;
          status?: SessionStatus;
          scheduled_date?: string;
          completed_at?: string | null;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "workout_sessions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "workout_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      session_logs: {
        Row: {
          id: string;
          session_id: string;
          plan_exercise_id: string | null;
          set_number: number;
          actual_reps: number | null;
          actual_weight: number | null;
          completed: boolean;
          rpe: number | null;
          note: string | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          plan_exercise_id?: string | null;
          set_number: number;
          actual_reps?: number | null;
          actual_weight?: number | null;
          completed?: boolean;
          rpe?: number | null;
          note?: string | null;
        };
        Update: {
          id?: string;
          session_id?: string;
          plan_exercise_id?: string | null;
          set_number?: number;
          actual_reps?: number | null;
          actual_weight?: number | null;
          completed?: boolean;
          rpe?: number | null;
          note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "session_logs_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "workout_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_logs_plan_exercise_id_fkey";
            columns: ["plan_exercise_id"];
            isOneToOne: false;
            referencedRelation: "plan_exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      body_measurements: {
        Row: {
          id: string;
          user_id: string;
          measured_on: string;
          weight_kg: number;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          measured_on: string;
          weight_kg: number;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          measured_on?: string;
          weight_kg?: number;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "body_measurements_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

// Convenience row aliases
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Exercise = Database["public"]["Tables"]["exercises"]["Row"];

// Exercise catalog category values (mirror the CHECK constraints in 0013).
export const MUSCLE_GROUPS = [
  "chest",
  "back",
  "legs",
  "shoulders",
  "arms",
  "core",
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const EXERCISE_TYPES = ["compound", "isolation"] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export const EQUIPMENT_VALUES = [
  "barbell",
  "dumbbell",
  "cable",
  "machine",
  "bodyweight",
] as const;
export type Equipment = (typeof EQUIPMENT_VALUES)[number];

export const EXERCISE_LOCATIONS = ["home", "gym"] as const;
export type ExerciseLocation = (typeof EXERCISE_LOCATIONS)[number];

// Fine-grained muscles targeted on the interactive body map (0014).
export const PRIMARY_MUSCLES = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "abs",
  "glutes",
  "quads",
  "hamstrings",
  "calves",
] as const;
export type PrimaryMuscle = (typeof PRIMARY_MUSCLES)[number];

/** Shared placeholder technique GIF until per-exercise GIFs are added. */
export const EXERCISE_PLACEHOLDER_GIF = "/Dips-Between-Chairs.gif";
export type WorkoutPlan = Database["public"]["Tables"]["workout_plans"]["Row"];
export type PlanExercise =
  Database["public"]["Tables"]["plan_exercises"]["Row"];
export type WorkoutSession =
  Database["public"]["Tables"]["workout_sessions"]["Row"];
export type SessionLog = Database["public"]["Tables"]["session_logs"]["Row"];
export type BodyMeasurement =
  Database["public"]["Tables"]["body_measurements"]["Row"];
