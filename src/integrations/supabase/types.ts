export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      metadata_presets: {
        Row: {
          aspect_ratios: Json
          characters: Json
          created_at: string
          filters: Json
          formats: Json
          id: string
          lenses: Json
          luts: Json
          name: string
          owner_id: string
          resolutions: Json
          updated_at: string
        }
        Insert: {
          aspect_ratios?: Json
          characters?: Json
          created_at?: string
          filters?: Json
          formats?: Json
          id: string
          lenses?: Json
          luts?: Json
          name?: string
          owner_id: string
          resolutions?: Json
          updated_at?: string
        }
        Update: {
          aspect_ratios?: Json
          characters?: Json
          created_at?: string
          filters?: Json
          formats?: Json
          id?: string
          lenses?: Json
          luts?: Json
          name?: string
          owner_id?: string
          resolutions?: Json
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          aspect_ratios: Json
          characters: Json
          created_at: string
          filters: Json
          formats: Json
          id: string
          lenses: Json
          luts: Json
          media_type: string
          owner_id: string
          production_name: string | null
          resolutions: Json
          title: string
          updated_at: string
        }
        Insert: {
          aspect_ratios?: Json
          characters?: Json
          created_at?: string
          filters?: Json
          formats?: Json
          id: string
          lenses?: Json
          luts?: Json
          media_type?: string
          owner_id: string
          production_name?: string | null
          resolutions?: Json
          title: string
          updated_at?: string
        }
        Update: {
          aspect_ratios?: Json
          characters?: Json
          created_at?: string
          filters?: Json
          formats?: Json
          id?: string
          lenses?: Json
          luts?: Json
          media_type?: string
          owner_id?: string
          production_name?: string | null
          resolutions?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      takes: {
        Row: {
          aperture: string | null
          aspect_ratio: string | null
          camera_roll: string | null
          character_name: string | null
          filter: string | null
          format: string | null
          fps: string | null
          good_take: boolean
          id: string
          iso: string | null
          lens: string | null
          logged_at: string
          lut: string | null
          notes: string | null
          owner_id: string
          project_id: string
          resolution: string | null
          scene: string
          shot: string
          shutter: string | null
          sound_roll: string | null
          take: number
          updated_at: string
          wb: string | null
        }
        Insert: {
          aperture?: string | null
          aspect_ratio?: string | null
          camera_roll?: string | null
          character_name?: string | null
          filter?: string | null
          format?: string | null
          fps?: string | null
          good_take?: boolean
          id: string
          iso?: string | null
          lens?: string | null
          logged_at?: string
          lut?: string | null
          notes?: string | null
          owner_id: string
          project_id: string
          resolution?: string | null
          scene?: string
          shot?: string
          shutter?: string | null
          sound_roll?: string | null
          take?: number
          updated_at?: string
          wb?: string | null
        }
        Update: {
          aperture?: string | null
          aspect_ratio?: string | null
          camera_roll?: string | null
          character_name?: string | null
          filter?: string | null
          format?: string | null
          fps?: string | null
          good_take?: boolean
          id?: string
          iso?: string | null
          lens?: string | null
          logged_at?: string
          lut?: string | null
          notes?: string | null
          owner_id?: string
          project_id?: string
          resolution?: string | null
          scene?: string
          shot?: string
          shutter?: string | null
          sound_roll?: string | null
          take?: number
          updated_at?: string
          wb?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "takes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "dit" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "dit", "viewer"],
    },
  },
} as const
