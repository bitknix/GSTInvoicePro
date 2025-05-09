from fastapi import APIRouter

from app.api.api_v1.endpoints import auth, users, business_profiles, customers, products, invoices, exports, summary, dashboard, health

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(business_profiles.router, prefix="/business-profiles", tags=["business-profiles"])
api_router.include_router(customers.router, prefix="/customers", tags=["customers"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["invoices"])
api_router.include_router(exports.router, prefix="/exports", tags=["exports"])
api_router.include_router(summary.router, prefix="/summary", tags=["summary"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(health.router, prefix="/health", tags=["health"]) 