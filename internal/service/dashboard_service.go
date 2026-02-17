package service

import (
	"context"
	"time"

	"sancaksoft/internal/api/dto"
	"sancaksoft/internal/repository"

	"github.com/google/uuid"
)

type DashboardService struct {
	repo *repository.DashboardRepository
}

func NewDashboardService(repo *repository.DashboardRepository) *DashboardService {
	return &DashboardService{repo: repo}
}

func (s *DashboardService) GetDashboardStats(ctx context.Context, tenantID uuid.UUID) (*dto.DashboardStatsDTO, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return s.repo.GetStats(ctx, tenantID)
}
