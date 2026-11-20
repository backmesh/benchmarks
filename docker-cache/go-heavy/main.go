// Representative Go/Rust-class compile-heavy image for
// design-cache-phase1.md's docker spike: a handful of real module
// dependencies (gin, cobra, zap, gorm+sqlite) so a cold build pays module
// download and real package compilation, not just an empty `go build`.
package main

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/spf13/cobra"
	"go.uber.org/zap"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type Widget struct {
	gorm.Model
	Name string
}

func main() {
	root := &cobra.Command{
		Use: "cache-phase1-go-heavy",
		Run: func(cmd *cobra.Command, args []string) {
			logger, _ := zap.NewProduction()
			defer logger.Sync()
			db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
			if err != nil {
				logger.Fatal("open db", zap.Error(err))
			}
			db.AutoMigrate(&Widget{})

			r := gin.New()
			r.GET("/health", func(c *gin.Context) {
				c.JSON(200, gin.H{"ok": true})
			})
			fmt.Println("built ok")
		},
	}
	_ = root.Execute()
}
