export interface FollowStatus {
    is_following: boolean;
    is_followed_by: boolean;
    is_mutual: boolean;
    can_chat?: boolean;
}

export interface FollowUser {
    id: number;
    first_name: string;
    last_name: string;
    email?: string;
    avatar?: string;
    is_following: boolean;
    is_followed_by: boolean;
    is_mutual: boolean;
    can_chat?: boolean;
    followed_at?: string;
}

export interface UserWithFollowStatus {
    id: number;
    first_name: string;
    last_name: string;
    email?: string;
    avatar?: string;
    is_following: boolean;
    is_followed_by: boolean;
    is_mutual: boolean;
    can_chat: boolean;
}

export interface FollowResponse {
    success: boolean;
    message: string;
    follow_status: FollowStatus;
}

export interface FollowListResponse {
    success: boolean;
    data: FollowUser[];
    meta: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
}

export interface NotMutualFollowersError {
    success: false;
    message: string;
    error_code: 'NOT_MUTUAL_FOLLOWERS';
    follow_status: FollowStatus;
    follow_request_sent: boolean;
}
