#Regresion logistica

## Lectura del archivo cartera 
## Revisar que el archivo cartera se encuentre en documentos, 
## o la ruta en donde se encuentra direccionado R

getwd()

## Copiar los archivos descargados en la ruta que surge de correr el 
## comando anterior
#Ruta de las bases de datos
setwd('~/Desktop/mercadeo2016mac/0VARIOSHUGO/basesdatos/')

## Revisar que el archivo MAOSBASE se encuentre en documentos, 
## o la ruta en donde se encuentra direccionado R

if (!require('readxl')) install.packages('readxl')
if (!require('caret')) install.packages('caret')
if (!require('ROCR')) install.packages('ROCR')
if (!require('lift')) install.packages('lift')
if (!require('ggplot2')) install.packages('ggplot2')

#################Ejercicio Basico
#Instalar la libreria para cargar el archivo de excel.
install.packages("readxl")
library("readxl")

#Ejemplo de introducción de Regresión Logistica - Nivel de satisfacción
#base de datos.
finansatis<-read_excel("financierosatisfaccion.xlsx")
str(finansatis)
#Convertir la variable en factor con los dos niveles - 1 satisfecho, 0 no satisfecho.
finansatis$satisfecho<-as.factor(finansatis$satisfecho)
##Modelo de regresión logistica
modelo.logit<-glm(satisfecho ~ edad + saldo,family=binomial,finansatis)
#Revisión del modelo y sus coeficientes
summary(modelo.logit)

# Predicción de satisfacción, conociendo la edad de 41 años y saldo $1000

nuevos_datos <- data.frame(edad = 41, saldo = 1000)
prediccion <- predict(modelo.logit, nuevos_datos, type = "response")
print(prediccion)

# Crear el DataFrame con los datos proporcionados directamente en código 

finansatis1 <- data.frame(
  edad = c(30, 33, 35, 30, 59, 35, 36, 39, 41, 43, 39, 43),
  saldo = c(1787, 4108, 1350, 1476, 0, 747, 307, 147, 221, -88, 3374, 264),
  satisfecho = as.factor(c(1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0))
)

# Ver estructura del DataFrame
str(finansatis1)

# Ajustar el modelo de regresión logística
modelo.logit1 <- glm(satisfecho ~ edad + saldo, family = binomial, data = finansatis1)

# Mostrar resumen del modelo
summary(modelo.logit1)

# Calcular coeficientes y "odds ratios"
coeficientes1 <- modelo.logit1$coefficients
odd_change1 <- exp(coeficientes1)
print(odd_change1)

# Calcular proporciones y "odds ratios" base
balance1 <- table(finansatis1$satisfecho)
prop.table(balance1)
oddbase1 <- prop.table(balance1)[2] / prop.table(balance1)[1]
print(oddbase1)

# Calcular "odds ratios" finales y probabilidades
oddfin1 <- oddbase * odd_change1
prob1step <- oddfin1 / (1 + oddfin1)
print(prob1step)

# Predicción para nuevos datos
nuevos_datos1 <- data.frame(edad = 41, saldo = 1000)
prediccion1 <- predict(modelo.logit, nuevos_datos1, type = "response")
print(prediccion1)

## Lectura del archivo cartera 
## Revisar que el archivo cartera se encuentre en documentos, 
## o la ruta en donde se encuentra direccionado R

getwd()

cartera<-read_excel("carteraguia2017.xlsx")
str(cartera)

cartera$TIPOips<-as.factor(cartera$TIPO_ips)

library(caret)
carterawin<-dummyVars("~.",data=cartera)
carterafin<-as.data.frame(predict(carterawin,newdata=cartera))
carterafin2<-within(carterafin,rm(TIPOips.5,TIPOips.2, TIPO_ips, VENTAS_MENS_PROMEDIO,cartera_actual_insumos_B))
carterafin2$retrasos<-as.factor(carterafin2$retrasos)

balance<-table(cartera$retrasos)
prop.table(balance)

set.seed(1545867) #
#aqu? se define el tama?o de la muestra, en este caso entrenamiento tendr? el 75% de los casos
sample <- sample.int(nrow(carterafin2), floor(.75*nrow(carterafin2)))
cartera.train <- carterafin2[sample, ]
cartera.test <- carterafin2[-sample, ]

##Modelo
modelo.logit<-glm(retrasos~.,family=binomial,cartera.train)
#trace=0 impide ver todos los detalles de la optimizaci?n stepwise
steplogit<-step(modelo.logit, direction="both", trace=0)
summary(steplogit)

coeficientes<-steplogit$coefficients
odd_change<-exp(coeficientes)
odd_change

#Odd ratios
balance<-table(cartera$retrasos)
prop.table(balance)
oddbase<-prop.table(balance)[2]/prop.table(balance)[1]
oddbase

oddfin<-oddbase*odd_change
prob1step<-oddfin/(1+oddfin)
prob1step

#crear matriz vacia
oddprueba<-matrix(,5,29)
probprueba<-matrix(,5,29)

#borrar el intercepto
odd_change2<-odd_change[2:6]

#guardar odd base y probabilidad base
oddprueba[,10]<-oddbase
probprueba[,10]<-oddprueba[,10]/(1+oddprueba[,10])

#calcular odds y probabilidades 17 pasos adelante
for (i in 11:29){ 
  oddprueba[,i]<-oddprueba[,i-1]*odd_change2
  probprueba[,i]<-oddprueba[,i]/(1+oddprueba[,i])
}
#y 10 atr?s
for (i in 10:1){ 
  oddprueba[,i]<-oddprueba[,i+1]/odd_change2
  probprueba[,i]<-oddprueba[,i]/(1+oddprueba[,i])
}

#guardar en un dataframe
probver<-as.data.frame(t(probprueba))
#crear id y graficar: cartera insumos A
probver$id<-seq(1:29)-11
names(probver)<-c("anos igual dueno","anos direccion actual","%pasivo/ venta anual","cartera insumos A","Tipo IPs 4", "pasos")
plot(probver$pasos, probver$`cartera insumos A`)


#crea el pronostico base de entrenamiento
prontrain<-ifelse(steplogit$fitted.values > 0.5,1,0)
#tabla de confusi?n y estad?sticas, base de entrenamiento
# library(caret)
conftrain<-confusionMatrix(as.factor(prontrain),cartera.train$retrasos, positive = "1")
conftrain$table
conftrain$byClass

#crea el pron?stico en validaci?n
probtest<-predict(steplogit,newdata = cartera.test,type='response')
prontest<-ifelse(probtest > 0.5,1,0)
conftest<-confusionMatrix(as.factor(prontest),cartera.test$retrasos, positive = "1")
conftest$table
conftest$byClass



library(ROCR)
#crear objeto de predicciones
pr<-prediction(probtest,cartera.test$retrasos)
#creacion del objeto de la curva
curvaROC<-performance(pr,measure="tpr",x.measure="fpr")
#grafico de la curva
plot(curvaROC)
#calcular el AUC
auc<-performance(pr,measure = "auc")
auc <- auc@y.values[[1]]
#ver el AUC
auc

fprs<-unlist(curvaROC@x.values)
tprs<-unlist(curvaROC@y.values)
tablaCOR<-as.data.frame(cbind(fprs,tprs))
tablaCOR[75:85,]

gain<-performance(pr, "tpr", "rpp")
plot(gain)


#guardar las exhaustividades y puntos de corte
tablafinan<-performance(pr,measure="rec")
cutoffs<-unlist(tablafinan@x.values)
recalls<-unlist(tablafinan@y.values)
#guardar las precisiones
tablafina2<-performance(pr,measure="prec")
precisions<-unlist(tablafina2@y.values)
#crear la tabla conjunta
tablacruce<-as.data.frame(cbind(cutoffs,precisions,recalls))
#ver precisiones versus exhaustividad
plot(tablacruce$precisions,tablacruce$recalls)
#calcular las ganancias
tablacruce$wins<-prop.table(balance)[2]*recalls*(500-(100/precisions))
#pintar las ganancias versus los cutoffs
plot(tablacruce$cutoffs,tablacruce$wins)
#ver las ganancias frente a la precisi?n
plot(tablacruce$precisions,tablacruce$wins)



#Balanceo como mecanismo de mejores predicciones.
##separamos ceros y unos
mayorcero<-subset(carterafin2,carterafin2$retrasos==0)
menoruno<-subset(carterafin2,carterafin2$retrasos==1)

#en ambas bases el 20% es prueba
set.seed(24029114) 
#20% de ceros
sample <- sample.int(nrow(mayorcero), round(.2*nrow(mayorcero)))
mayorcero.test <- mayorcero[sample, ]
mayorcero.rest <- mayorcero[-sample, ]
#20% de unos
sample <- sample.int(nrow(menoruno), round(.2*nrow(menoruno)))
menoruno.test <- menoruno[sample, ]
menoruno.rest <- menoruno[-sample, ]
#fundo las dos
cart.test<-rbind(mayorcero.test,menoruno.test)
nrow(cart.test)

sample <- sample.int(nrow(menoruno.rest), round(.5*nrow(menoruno.rest)))
menoruno.train <- menoruno.rest[sample, ]
menoruno.valid <- menoruno.rest[-sample, ]

#BALANCEO 
#pongo la misma cantidad de ceros y unos en entrenamiento: 
sample <- sample.int(nrow(mayorcero.rest), nrow(menoruno.train))
mayorcero.train <- mayorcero.rest[sample, ]
mayorcero.valid <- mayorcero.rest[-sample, ]
#creo entrenamiento y validaci?n
cart.train<-rbind(mayorcero.train,menoruno.train)
cart.valid<-rbind(mayorcero.valid,menoruno.valid)
#chequeo que todo va bien
table(cart.train$retrasos)
table(cart.valid$retrasos)
table(cart.test$retrasos)
prop.table(table(cart.train$retrasos))
prop.table(table(cart.valid$retrasos))
prop.table(table(cart.test$retrasos))
prop.table(table(carterafin2$retrasos))


# library(ggplot2)
ggplot(cart.train,aes(x=cart.train$IGUAL_DUENO,                      y=cart.train$cartera_actual_insumos_A,color=cart.train$retrasos))+geom_point()


modelo.balance<-glm(retrasos~.,family=binomial,cart.train)
#trace=0 impide ver todos los detalles de la optimizaci?n stepwise
stepbalance<-step(modelo.balance, direction="both", trace=0)
summary(stepbalance)

coeficientes2<-stepbalance$coefficients
odd_changeb<-exp(coeficientes2)
odd_changeb

# library(caret)

#crea el pron?stico en validaci?n
probtest2<-predict(stepbalance,newdata = cart.test,type='response')
prontest2<-ifelse(probtest2 > 0.5,1,0)
conftest2<-confusionMatrix(as.factor(prontest2),cart.test$retrasos, positive = "1")
conftest2$table
conftest2$byClass

# library(ROCR)
#crear objeto de predicciones
pr2<-prediction(probtest2,cart.test$retrasos)
#creacion del objeto de la curva
curvaROC2<-performance(pr2,measure="tpr",x.measure="fpr")
#grafico de la curva
plot(curvaROC2)
#calcular el AUC
auc2<-performance(pr2,measure = "auc")
auc2f <- auc2@y.values[[1]]
#ver el AUC
auc2f

