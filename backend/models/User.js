const { getSupabase } = require('../supabaseClient');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class User {
    constructor() {
        // Lazy initialization
        this.db = null;
    }

    getDb() {
        if (!this.db) {
            this.db = getSupabase();
        }
        return this.db;
    }

    async create(userData) {
        try {
            // Hash password
            const saltRounds = 12;
            const passwordHash = await bcrypt.hash(userData.password, saltRounds);

            // Create user
            const db = this.getDb();
            const { data, error } = await db.query('users', db.client
                .from('users')
                .insert({
                    email: userData.email,
                    password_hash: passwordHash,
                    full_name: userData.full_name,
                    phone_number: userData.phone_number || null,
                    role: userData.role || 'business_owner'
                })
                .select()
                .single()
            );

            if (error) {
                if (error.code === '23505') { // Unique violation
                    throw new Error('Email already exists');
                }
                throw error;
            }

            // Create associated business
            if (userData.business_name) {
                await this.createBusiness(data.user_id, userData.business_name);
            }

            return data;
        } catch (error) {
            throw error;
        }
    }

    async createBusiness(userId, businessName) {
        try {
            const db = this.getDb();
            const { data, error } = await db.query('businesses', db.client
                .from('businesses')
                .insert({
                    user_id: userId,
                    business_name: businessName,
                    business_type: 'general'
                })
                .select()
                .single()
            );

            if (error) throw error;
            return data;
        } catch (error) {
            throw error;
        }
    }

    async findByEmail(email) {
        try {
            const db = this.getDb();
            const { data, error } = await db.query('users', db.client
                .from('users')
                .select('*')
                .eq('email', email)
                .single()
            );

            if (error) throw error;
            return data || null;
        } catch (error) {
            throw error;
        }
    }

    async findById(userId) {
        try {
            const db = this.getDb();
            const { data, error } = await db.query('users', db.client
                .from('users')
                .select('*')
                .eq('user_id', userId)
                .single()
            );

            if (error) throw error;
            return data || null;
        } catch (error) {
            throw error;
        }
    }

    async validatePassword(email, password) {
        try {
            const user = await this.findByEmail(email);
            if (!user) return false;

            return bcrypt.compare(password, user.password_hash);
        } catch (error) {
            throw error;
        }
    }

    async generateAuthToken(user) {
        return jwt.sign(
            {
                userId: user.user_id,
                email: user.email,
                role: user.role,
                businessId: user.business_id
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || '15m'
            }
        );
    }

    async generateRefreshToken(user) {
        return jwt.sign(
            {
                userId: user.user_id
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
            }
        );
    }

    async updatePassword(userId, newPassword) {
        try {
            const saltRounds = 12;
            const passwordHash = await bcrypt.hash(newPassword, saltRounds);

            const db = this.getDb();
            const { data, error } = await db.query('users', db.client
                .from('users')
                .update({
                    password_hash: passwordHash,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .select()
                .single()
            );

            if (error) throw error;
            return data;
        } catch (error) {
            throw error;
        }
    }

    async updateProfile(userId, profileData) {
        try {
            const db = this.getDb();
            const { data, error } = await db.query('users', db.client
                .from('users')
                .update({
                    full_name: profileData.full_name || undefined,
                    phone_number: profileData.phone_number || undefined,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .select()
                .single()
            );

            if (error) throw error;
            return data;
        } catch (error) {
            throw error;
        }
    }

    async getUserWithBusiness(userId) {
        try {
            // Supabase doesn't support direct joins in the same way, so we'll do two queries
            const db = this.getDb();
            const { data: user, error: userError } = await db.query('users', db.client
                .from('users')
                .select('*')
                .eq('user_id', userId)
                .single()
            );

            if (userError) throw userError;

            const { data: business, error: businessError } = await db.query('businesses', db.client
                .from('businesses')
                .select('*')
                .eq('user_id', userId)
                .single()
            );

            if (businessError && businessError.code !== 'PGRST116') { // PGRST116 = no rows found
                throw businessError;
            }

            return {
                ...user,
                business_id: business?.business_id,
                business_name: business?.business_name,
                business_type: business?.business_type
            };
        } catch (error) {
            throw error;
        }
    }

    async findByRefreshToken(token) {
        try {
            const db = this.getDb();
            const { data, error } = await db.query('refresh_tokens', db.client
                .from('refresh_tokens')
                .select('*, users(*)')
                .eq('token', token)
                .eq('revoked', false)
                .single()
            );

            if (error) throw error;
            return data?.users || null;
        } catch (error) {
            throw error;
        }
    }

    async storeRefreshToken(userId, token, expiresAt) {
        try {
            const db = this.getDb();
            const { error } = await db.query('refresh_tokens', db.client
                .from('refresh_tokens')
                .upsert({
                    user_id: userId,
                    token: token,
                    expires_at: expiresAt,
                    revoked: false
                })
                .eq('user_id', userId)
            );

            if (error) throw error;
        } catch (error) {
            throw error;
        }
    }

    async revokeRefreshToken(token) {
        try {
            const db = this.getDb();
            const { error } = await db.query('refresh_tokens', db.client
                .from('refresh_tokens')
                .update({
                    revoked: true
                })
                .eq('token', token)
            );

            if (error) throw error;
        } catch (error) {
            throw error;
        }
    }

    async delete(userId) {
        try {
            const db = this.getDb();
            // Delete refresh tokens
            await db.query('refresh_tokens', db.client
                .from('refresh_tokens')
                .delete()
                .eq('user_id', userId)
            );

            // Delete business (if exists)
            await db.query('businesses', db.client
                .from('businesses')
                .delete()
                .eq('user_id', userId)
            );

            // Delete user
            const { data, error } = await db.query('users', db.client
                .from('users')
                .delete()
                .eq('user_id', userId)
                .select()
                .single()
            );

            if (error) throw error;
            return data;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new User();